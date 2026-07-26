import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireRole, requireUser } from './lib/auth'
import { now } from './lib/time'

const paymentProviderValidator = v.union(v.literal('esewa'), v.literal('khalti'))

export const createTransaction = mutation({
  args: {
    vehicleId: v.id('vehicles'),
    paymentProvider: v.optional(paymentProviderValidator),
  },
  handler: async (ctx, args) => {
    const buyer = await requireUser(ctx)
    requireRole(buyer, ['buyer', 'admin'])

    const listing = await ctx.db.get(args.vehicleId)
    if (!listing) {
      throw new ConvexError('Listing not found')
    }
    if (listing.status !== 'live') {
      throw new ConvexError('Listing is not available for purchase')
    }
    if (listing.sellerId === buyer._id) {
      throw new ConvexError('You cannot buy your own listing')
    }

    const existing = await ctx.db
      .query('transactions')
      .withIndex('by_vehicle', (q) => q.eq('vehicleId', args.vehicleId))
      .collect()

    const activeForBuyer = existing.find(
      (tx) =>
        tx.buyerId === buyer._id &&
        tx.status !== 'cancelled' &&
        tx.status !== 'failed',
    )

    if (activeForBuyer) {
      return activeForBuyer._id
    }

    return await ctx.db.insert('transactions', {
      vehicleId: args.vehicleId,
      buyerId: buyer._id,
      sellerId: listing.sellerId,
      amountNpr: listing.priceNpr,
      status: args.paymentProvider ? 'payment_pending' : 'initiated',
      paymentProvider: args.paymentProvider,
      createdAt: now(),
      updatedAt: now(),
    })
  },
})

export const listMyTransactions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const limit = Math.min(100, Math.max(1, args.limit ?? 50))

    if (user.role === 'admin') {
      return await ctx.db.query('transactions').order('desc').take(limit)
    }

    if (user.role === 'seller') {
      return await ctx.db
        .query('transactions')
        .withIndex('by_seller_createdAt', (q) => q.eq('sellerId', user._id))
        .order('desc')
        .take(limit)
    }

    return await ctx.db
      .query('transactions')
      .withIndex('by_buyer_createdAt', (q) => q.eq('buyerId', user._id))
      .order('desc')
      .take(limit)
  },
})

export const getTransaction = query({
  args: {
    transactionId: v.id('transactions'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const transaction = await ctx.db.get(args.transactionId)

    if (!transaction) {
      return null
    }

    const canAccess =
      user.role === 'admin' ||
      transaction.buyerId === user._id ||
      transaction.sellerId === user._id

    if (!canAccess) {
      throw new ConvexError('Forbidden')
    }

    const [vehicle, buyer, seller] = await Promise.all([
      ctx.db.get(transaction.vehicleId),
      ctx.db.get(transaction.buyerId),
      ctx.db.get(transaction.sellerId),
    ])

    return {
      transaction,
      vehicle,
      buyer,
      seller,
    }
  },
})
