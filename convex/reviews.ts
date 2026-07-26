import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { logAdminAction } from './lib/audit'
import { requireAdmin, requireUser } from './lib/auth'

const moderationStatusValidator = v.union(
  v.literal('visible'),
  v.literal('flagged'),
  v.literal('hidden'),
)

export const createReview = mutation({
  args: {
    transactionId: v.id('transactions'),
    toUserId: v.id('users'),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx)
    if (args.rating < 1 || args.rating > 5) {
      throw new ConvexError('Rating must be between 1 and 5')
    }

    const transaction = await ctx.db.get(args.transactionId)
    if (!transaction) {
      throw new ConvexError('Transaction not found')
    }

    const isParticipant =
      transaction.buyerId === actor._id || transaction.sellerId === actor._id

    if (!isParticipant) {
      throw new ConvexError('Forbidden')
    }

    if (
      transaction.status !== 'paid' &&
      transaction.status !== 'document_generated' &&
      transaction.status !== 'completed'
    ) {
      throw new ConvexError('Review is allowed after payment completion')
    }

    if (args.toUserId === actor._id) {
      throw new ConvexError('You cannot review yourself')
    }

    const validRecipient =
      args.toUserId === transaction.buyerId || args.toUserId === transaction.sellerId

    if (!validRecipient) {
      throw new ConvexError('Recipient is not part of this transaction')
    }

    const existing = await ctx.db
      .query('reviews')
      .withIndex('by_transaction_from', (q) =>
        q.eq('transactionId', args.transactionId).eq('fromUserId', actor._id),
      )
      .first()

    if (existing) {
      throw new ConvexError('You already submitted a review for this transaction')
    }

    return await ctx.db.insert('reviews', {
      transactionId: args.transactionId,
      listingId: transaction.vehicleId,
      fromUserId: actor._id,
      toUserId: args.toUserId,
      rating: args.rating,
      comment: args.comment,
      moderationStatus: 'visible',
      createdAt: Date.now(),
    })
  },
})

export const listForUser = query({
  args: {
    userId: v.optional(v.id('users')),
    listingId: v.optional(v.id('vehicles')),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx)

    const targetUserId = args.userId ?? actor._id
    if (targetUserId !== actor._id && actor.role !== 'admin') {
      throw new ConvexError('Forbidden')
    }

    let reviews = await ctx.db
      .query('reviews')
      .withIndex('by_toUserId', (q) => q.eq('toUserId', targetUserId))
      .collect()

    if (args.listingId) {
      reviews = reviews.filter((review) => review.listingId === args.listingId)
    }

    if (actor.role !== 'admin') {
      reviews = reviews.filter((review) => review.moderationStatus !== 'hidden')
    }

    reviews.sort((a, b) => b.createdAt - a.createdAt)
    return reviews
  },
})

export const listForListingPublic = query({
  args: {
    listingId: v.id('vehicles'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(100, Math.max(1, args.limit ?? 20))
    const reviews = await ctx.db
      .query('reviews')
      .withIndex('by_listingId', (q) => q.eq('listingId', args.listingId))
      .collect()

    return reviews
      .filter((review) => review.moderationStatus !== 'hidden')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
  },
})

export const flagReview = mutation({
  args: {
    reviewId: v.id('reviews'),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx)
    const review = await ctx.db.get(args.reviewId)
    if (!review) {
      throw new ConvexError('Review not found')
    }

    await ctx.db.patch(args.reviewId, {
      moderationStatus: 'flagged',
    })

    return await ctx.db.get(args.reviewId)
  },
})

export const moderateReview = mutation({
  args: {
    reviewId: v.id('reviews'),
    moderationStatus: moderationStatusValidator,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const review = await ctx.db.get(args.reviewId)

    if (!review) {
      throw new ConvexError('Review not found')
    }

    await ctx.db.patch(args.reviewId, {
      moderationStatus: args.moderationStatus,
    })

    await logAdminAction(ctx, {
      adminUserId: admin._id,
      action: 'review_moderated',
      targetTable: 'reviews',
      targetId: args.reviewId,
      metadata: { status: args.moderationStatus },
    })

    return await ctx.db.get(args.reviewId)
  },
})
