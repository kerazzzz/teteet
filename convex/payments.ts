import { ConvexError, v } from 'convex/values'
import { mutation, query, type MutationCtx } from './_generated/server'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { requireRole, requireUser } from './lib/auth'
import { now } from './lib/time'

const providerValidator = v.union(v.literal('esewa'), v.literal('khalti'))

type Provider = 'esewa' | 'khalti'

function isGatewayConfigured(provider: Provider) {
  if (provider === 'esewa') {
    return Boolean(process.env.ESEWA_MERCHANT_CODE && process.env.ESEWA_SECRET_KEY)
  }
  return Boolean(process.env.KHALTI_PUBLIC_KEY && process.env.KHALTI_SECRET_KEY)
}

function normalizeGatewayStatus(raw: string) {
  const status = raw.trim().toLowerCase()
  if (
    status.includes('success') ||
    status === 'paid' ||
    status === 'complete' ||
    status === 'completed'
  ) {
    return 'paid' as const
  }
  if (
    status.includes('fail') ||
    status.includes('cancel') ||
    status.includes('error') ||
    status === 'declined'
  ) {
    return 'failed' as const
  }
  return 'payment_pending' as const
}

function buildCheckoutUrl(args: {
  provider: Provider
  amountNpr: number
  transactionId: string
  intentId: string
}) {
  if (args.provider === 'esewa') {
    const base =
      process.env.ESEWA_SANDBOX_URL ??
      'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
    const params = new URLSearchParams({
      amount: String(args.amountNpr),
      transaction_id: args.transactionId,
      intent_id: args.intentId,
    })
    return `${base}?${params.toString()}`
  }

  const base = process.env.KHALTI_SANDBOX_URL ?? 'https://khalti.com/pay'
  const params = new URLSearchParams({
    amount: String(args.amountNpr),
    transaction_id: args.transactionId,
    intent_id: args.intentId,
  })
  return `${base}?${params.toString()}`
}

async function reconcileEvent(
  ctx: MutationCtx,
  args: {
    transactionId: Id<'transactions'>
    provider: Provider
    eventId: string
    status: string
    paymentReference?: string
    rawPayload?: string
  },
) {
  const duplicate = await ctx.db
    .query('paymentEvents')
    .withIndex('by_provider_eventId', (q) =>
      q.eq('provider', args.provider).eq('eventId', args.eventId),
    )
    .first()

  if (duplicate) {
    const transaction = await ctx.db.get(args.transactionId)
    return {
      idempotent: true,
      normalizedStatus: duplicate.normalizedStatus,
      transaction,
    }
  }

  const transaction = await ctx.db.get(args.transactionId)
  if (!transaction) {
    throw new ConvexError('Transaction not found')
  }

  const normalizedStatus = normalizeGatewayStatus(args.status)

  await ctx.db.insert('paymentEvents', {
    transactionId: args.transactionId,
    provider: args.provider,
    eventId: args.eventId,
    rawPayload: args.rawPayload ?? '{}',
    normalizedStatus,
    createdAt: now(),
  })

  if (normalizedStatus === 'paid') {
    await ctx.db.patch(args.transactionId, {
      status: 'paid',
      paymentProvider: args.provider,
      paymentReference: args.paymentReference ?? transaction.paymentReference,
      paidAt: now(),
      updatedAt: now(),
    })

    await ctx.scheduler.runAfter(0, api.documents.generateSaleDocuments, {
      transactionId: args.transactionId,
    })
  } else if (normalizedStatus === 'failed') {
    await ctx.db.patch(args.transactionId, {
      status: 'failed',
      updatedAt: now(),
    })
  } else {
    await ctx.db.patch(args.transactionId, {
      status: 'payment_pending',
      updatedAt: now(),
    })
  }

  return {
    idempotent: false,
    normalizedStatus,
    transaction: await ctx.db.get(args.transactionId),
  }
}

export const getGatewayAvailability = query({
  args: {},
  handler: async () => {
    return {
      esewa: isGatewayConfigured('esewa'),
      khalti: isGatewayConfigured('khalti'),
    }
  },
})

export const createPaymentIntent = mutation({
  args: {
    transactionId: v.id('transactions'),
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx)
    requireRole(actor, ['buyer', 'admin'])

    const transaction = await ctx.db.get(args.transactionId)
    if (!transaction) {
      throw new ConvexError('Transaction not found')
    }

    if (actor.role !== 'admin' && transaction.buyerId !== actor._id) {
      throw new ConvexError('Forbidden')
    }

    if (!isGatewayConfigured(args.provider)) {
      throw new ConvexError(
        `${args.provider} gateway is not configured. Checkout is blocked until credentials are set.`,
      )
    }

    const intentId = `${args.provider}_${transaction._id}_${Math.random().toString(36).slice(2, 10)}`
    const paymentReference = `${args.provider}_${Date.now()}`

    await ctx.db.patch(transaction._id, {
      paymentProvider: args.provider,
      paymentIntentId: intentId,
      paymentReference,
      status: 'payment_pending',
      updatedAt: now(),
    })

    return {
      transactionId: transaction._id,
      paymentIntentId: intentId,
      provider: args.provider,
      checkoutUrl: buildCheckoutUrl({
        provider: args.provider,
        amountNpr: transaction.amountNpr,
        transactionId: transaction._id,
        intentId,
      }),
    }
  },
})

export const reconcilePayment = mutation({
  args: {
    transactionId: v.id('transactions'),
    provider: providerValidator,
    eventId: v.string(),
    status: v.string(),
    paymentReference: v.optional(v.string()),
    rawPayload: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await reconcileEvent(ctx, args)
  },
})

export const handleEsewaWebhook = mutation({
  args: {
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const payload = args.payload ?? {}
    const transactionId = String(
      payload.transactionId ?? payload.transaction_id ?? payload.product_code,
    )

    if (!transactionId) {
      throw new ConvexError('Missing transactionId in eSewa payload')
    }

    const eventId = String(
      payload.eventId ?? payload.event_id ?? payload.transaction_uuid ?? `${Date.now()}`,
    )

    const status = String(payload.status ?? payload.state ?? payload.result ?? 'pending')

    return await reconcileEvent(ctx, {
      transactionId: transactionId as Id<'transactions'>,
      provider: 'esewa',
      eventId,
      status,
      paymentReference: payload.refId ?? payload.reference,
      rawPayload: JSON.stringify(payload),
    })
  },
})

export const handleKhaltiWebhook = mutation({
  args: {
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const payload = args.payload ?? {}
    const transactionId = String(
      payload.transactionId ?? payload.transaction_id ?? payload.metadata?.transactionId,
    )

    if (!transactionId) {
      throw new ConvexError('Missing transactionId in Khalti payload')
    }

    const eventId = String(payload.eventId ?? payload.idx ?? payload.pidx ?? `${Date.now()}`)
    const status = String(payload.status ?? payload.state ?? 'pending')

    return await reconcileEvent(ctx, {
      transactionId: transactionId as Id<'transactions'>,
      provider: 'khalti',
      eventId,
      status,
      paymentReference: payload.pidx,
      rawPayload: JSON.stringify(payload),
    })
  },
})
