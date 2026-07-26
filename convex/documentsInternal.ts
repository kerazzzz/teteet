import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'
import { now } from './lib/time'

export const getTransactionBundle = internalQuery({
  args: {
    transactionId: v.id('transactions'),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId)
    if (!transaction) return null

    const [vehicle, buyer, seller] = await Promise.all([
      ctx.db.get(transaction.vehicleId),
      ctx.db.get(transaction.buyerId),
      ctx.db.get(transaction.sellerId),
    ])

    if (!vehicle || !buyer || !seller) return null

    const existingDocuments = await ctx.db
      .query('legalDocuments')
      .withIndex('by_transaction', (q) => q.eq('transactionId', args.transactionId))
      .collect()

    return {
      transaction,
      vehicle,
      buyer,
      seller,
      existingDocuments,
    }
  },
})

export const saveGeneratedDocuments = internalMutation({
  args: {
    transactionId: v.id('transactions'),
    billStorageId: v.optional(v.id('_storage')),
    ownershipStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('legalDocuments')
      .withIndex('by_transaction', (q) => q.eq('transactionId', args.transactionId))
      .collect()

    const hasBill = existing.some((doc) => doc.documentType === 'bill_of_sale')
    const hasOwnership = existing.some(
      (doc) => doc.documentType === 'ownership_transfer',
    )

    if (args.billStorageId && !hasBill) {
      await ctx.db.insert('legalDocuments', {
        transactionId: args.transactionId,
        documentType: 'bill_of_sale',
        storageId: args.billStorageId,
        fileName: `bill-of-sale-${args.transactionId}.pdf`,
        createdAt: now(),
      })
    }

    if (args.ownershipStorageId && !hasOwnership) {
      await ctx.db.insert('legalDocuments', {
        transactionId: args.transactionId,
        documentType: 'ownership_transfer',
        storageId: args.ownershipStorageId,
        fileName: `ownership-transfer-${args.transactionId}.pdf`,
        createdAt: now(),
      })
    }

    const transaction = await ctx.db.get(args.transactionId)
    if (transaction && transaction.status === 'paid') {
      await ctx.db.patch(args.transactionId, {
        status: 'document_generated',
        updatedAt: now(),
      })
    }

    return { success: true }
  },
})

export const listDocumentsWithUrls = internalQuery({
  args: {
    transactionId: v.id('transactions'),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query('legalDocuments')
      .withIndex('by_transaction', (q) => q.eq('transactionId', args.transactionId))
      .collect()

    return await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.storageId),
      })),
    )
  },
})
