import { ConvexError, v } from 'convex/values'
import { action, query } from './_generated/server'
import { internal } from './_generated/api'
import {
  buildBillOfSaleLines,
  buildOwnershipTransferLines,
  buildSimplePdf,
} from './lib/documents'
import { requireUser } from './lib/auth'

export const generateSaleDocuments = action({
  args: {
    transactionId: v.id('transactions'),
  },
  handler: async (ctx, args): Promise<any> => {
    const bundle = await ctx.runQuery(
      internal.documentsInternal.getTransactionBundle,
      {
        transactionId: args.transactionId,
      },
    )

    if (!bundle) {
      throw new ConvexError('Cannot generate documents, transaction bundle missing')
    }

    if (
      bundle.transaction.status !== 'paid' &&
      bundle.transaction.status !== 'document_generated' &&
      bundle.transaction.status !== 'completed'
    ) {
      throw new ConvexError('Documents can only be generated after payment')
    }

    const hasBill = bundle.existingDocuments.some(
      (doc: { documentType: string }) => doc.documentType === 'bill_of_sale',
    )
    const hasOwnership = bundle.existingDocuments.some(
      (doc: { documentType: string }) =>
        doc.documentType === 'ownership_transfer',
    )

    let billStorageId
    let ownershipStorageId

    if (!hasBill) {
      const billPdf = buildSimplePdf(
        buildBillOfSaleLines({
          vehicle: bundle.vehicle,
          buyer: bundle.buyer,
          seller: bundle.seller,
          transaction: bundle.transaction,
        }),
      )

      billStorageId = await ctx.storage.store(
        new Blob([billPdf], { type: 'application/pdf' }),
      )
    }

    if (!hasOwnership) {
      const ownershipPdf = buildSimplePdf(
        buildOwnershipTransferLines({
          vehicle: bundle.vehicle,
          buyer: bundle.buyer,
          seller: bundle.seller,
          transaction: bundle.transaction,
        }),
      )

      ownershipStorageId = await ctx.storage.store(
        new Blob([ownershipPdf], { type: 'application/pdf' }),
      )
    }

    await ctx.runMutation(internal.documentsInternal.saveGeneratedDocuments, {
      transactionId: args.transactionId,
      billStorageId,
      ownershipStorageId,
    })

    return await ctx.runQuery(internal.documentsInternal.listDocumentsWithUrls, {
      transactionId: args.transactionId,
    })
  },
})

export const getDocumentsForTransaction = query({
  args: {
    transactionId: v.id('transactions'),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx)
    const transaction = await ctx.db.get(args.transactionId)

    if (!transaction) {
      return []
    }

    const canAccess =
      actor.role === 'admin' ||
      transaction.buyerId === actor._id ||
      transaction.sellerId === actor._id

    if (!canAccess) {
      throw new ConvexError('Forbidden')
    }

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
