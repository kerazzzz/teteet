import { v } from 'convex/values'
import { query } from './_generated/server'
import { requireAdmin } from './lib/auth'

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const [
      totalUsers,
      liveListings,
      pendingListings,
      transactions,
      flaggedReviews,
      pendingSellerApplications,
    ] = await Promise.all([
        ctx.db.query('users').collect(),
        ctx.db
          .query('vehicles')
          .withIndex('by_status', (q) => q.eq('status', 'live'))
          .collect(),
        ctx.db
          .query('vehicles')
          .withIndex('by_status', (q) => q.eq('status', 'pending_approval'))
          .collect(),
        ctx.db.query('transactions').collect(),
        ctx.db.query('reviews').collect(),
        ctx.db
          .query('sellerApplications')
          .withIndex('by_status_createdAt', (q) => q.eq('status', 'pending'))
          .collect(),
      ])

    return {
      userCount: totalUsers.length,
      liveListingCount: liveListings.length,
      pendingListingCount: pendingListings.length,
      pendingSellerApplicationCount: pendingSellerApplications.length,
      transactionCount: transactions.length,
      flaggedReviewCount: flaggedReviews.filter((r) => r.moderationStatus === 'flagged').length,
    }
  },
})

export const listPendingListings = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const limit = Math.min(200, Math.max(1, args.limit ?? 100))

    return await ctx.db
      .query('vehicles')
      .withIndex('by_status', (q) => q.eq('status', 'pending_approval'))
      .order('desc')
      .take(limit)
  },
})

export const listUsers = query({
  args: {
    role: v.optional(
      v.union(v.literal('buyer'), v.literal('seller'), v.literal('admin')),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const limit = Math.min(500, Math.max(1, args.limit ?? 200))

    if (!args.role) {
      return await ctx.db.query('users').order('desc').take(limit)
    }

    return await ctx.db
      .query('users')
      .withIndex('by_role', (q) => q.eq('role', args.role!))
      .take(limit)
  },
})

export const listTransactions = query({
  args: {
    status: v.optional(
      v.union(
        v.literal('initiated'),
        v.literal('payment_pending'),
        v.literal('paid'),
        v.literal('document_generated'),
        v.literal('completed'),
        v.literal('cancelled'),
        v.literal('failed'),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const limit = Math.min(500, Math.max(1, args.limit ?? 200))

    if (!args.status) {
      return await ctx.db.query('transactions').order('desc').take(limit)
    }

    return await ctx.db
      .query('transactions')
      .withIndex('by_status', (q) => q.eq('status', args.status!))
      .take(limit)
  },
})

export const listReviews = query({
  args: {
    moderationStatus: v.optional(
      v.union(v.literal('visible'), v.literal('flagged'), v.literal('hidden')),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const limit = Math.min(500, Math.max(1, args.limit ?? 200))
    const reviews = await ctx.db.query('reviews').collect()
    const filtered = args.moderationStatus
      ? reviews.filter((review) => review.moderationStatus === args.moderationStatus)
      : reviews
    return filtered.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
  },
})

export const listSellerApplications = query({
  args: {
    status: v.optional(v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const limit = Math.min(500, Math.max(1, args.limit ?? 200))

    const applications = args.status
      ? await ctx.db
          .query('sellerApplications')
          .withIndex('by_status_createdAt', (q) => q.eq('status', args.status!))
          .order('desc')
          .take(limit)
      : await ctx.db.query('sellerApplications').order('desc').take(limit)

    return await Promise.all(
      applications.map(async (application) => {
        const applicant = await ctx.db.get(application.applicantId)
        const reviewer = application.reviewedBy
          ? await ctx.db.get(application.reviewedBy)
          : null

        return {
          ...application,
          applicant: applicant
            ? {
                _id: applicant._id,
                name: applicant.name,
                email: applicant.email,
                role: applicant.role,
                phone: applicant.phone,
                address: applicant.address,
                isActive: applicant.isActive,
              }
            : null,
          reviewer: reviewer
            ? {
                _id: reviewer._id,
                name: reviewer.name,
                email: reviewer.email,
              }
            : null,
        }
      }),
    )
  },
})

export const sellerApplicationStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const [pending, approved, rejected] = await Promise.all([
      ctx.db
        .query('sellerApplications')
        .withIndex('by_status_createdAt', (q) => q.eq('status', 'pending'))
        .collect(),
      ctx.db
        .query('sellerApplications')
        .withIndex('by_status_createdAt', (q) => q.eq('status', 'approved'))
        .collect(),
      ctx.db
        .query('sellerApplications')
        .withIndex('by_status_createdAt', (q) => q.eq('status', 'rejected'))
        .collect(),
    ])

    const totalWait = pending.reduce(
      (sum, item) => sum + Math.max(0, Math.round((Date.now() - item.submittedAt) / (1000 * 60 * 60))),
      0,
    )

    return {
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      avgPendingWaitHours: pending.length ? Math.round(totalWait / pending.length) : 0,
    }
  },
})
