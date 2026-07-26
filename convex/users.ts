import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getCurrentUser, requireAdmin, requireIdentity, requireUser } from './lib/auth'
import { now } from './lib/time'

const roleValidator = v.union(
  v.literal('buyer'),
  v.literal('seller'),
  v.literal('admin'),
)

export const upsertFromClerk = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()

    const derivedName =
      `${identity.givenName ?? ''} ${identity.familyName ?? ''}`.trim() ||
      identity.email ||
      'New User'

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: derivedName,
        email: identity.email ?? existing.email,
        avatarUrl: identity.pictureUrl ?? existing.avatarUrl,
        updatedAt: now(),
      })
      return existing._id
    }

    return await ctx.db.insert('users', {
      clerkId: identity.subject,
      email: identity.email ?? `${identity.subject}@unknown.local`,
      name: derivedName,
      role: 'buyer',
      isActive: true,
      avatarUrl: identity.pictureUrl,
      createdAt: now(),
      updatedAt: now(),
    })
  },
})

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx)
  },
})

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const patch: {
      name?: string
      phone?: string
      address?: string
      updatedAt: number
    } = {
      updatedAt: now(),
    }

    if (args.name !== undefined) {
      patch.name = args.name
    }
    if (args.phone !== undefined) {
      patch.phone = args.phone
    }
    if (args.address !== undefined) {
      patch.address = args.address
    }

    await ctx.db.patch(user._id, patch)
    return await ctx.db.get(user._id)
  },
})

export const setRole = mutation({
  args: {
    userId: v.id('users'),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx)

    const admins = await ctx.db
      .query('users')
      .withIndex('by_role', (q) => q.eq('role', 'admin'))
      .collect()

    const canBootstrapAdmin =
      admins.length === 0 && actor._id === args.userId && args.role === 'admin'

    if (actor.role !== 'admin' && !canBootstrapAdmin) {
      throw new ConvexError('Only admins can change roles')
    }

    const target = await ctx.db.get(args.userId)
    if (!target) {
      throw new ConvexError('User not found')
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: now(),
    })

    return await ctx.db.get(args.userId)
  },
})

export const getMySellerApplication = query({
  args: {},
  handler: async (ctx) => {
    const applicant = await requireUser(ctx)

    const latest = await ctx.db
      .query('sellerApplications')
      .withIndex('by_applicant_createdAt', (q) => q.eq('applicantId', applicant._id))
      .order('desc')
      .first()

    return latest ?? null
  },
})

export const submitSellerApplication = mutation({
  args: {
    businessName: v.string(),
    operatingDistrict: v.string(),
    contactPhone: v.string(),
    experienceSummary: v.string(),
    inventoryPlan: v.string(),
    motivation: v.string(),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const applicant = await requireUser(ctx)
    const trimmedContactPhone = args.contactPhone.trim()
    if (applicant.role !== 'buyer') {
      throw new ConvexError('Only buyers can submit seller applications')
    }

    const hasPending = await ctx.db
      .query('sellerApplications')
      .withIndex('by_applicant_status', (q) =>
        q.eq('applicantId', applicant._id).eq('status', 'pending'),
      )
      .first()
    if (hasPending) {
      throw new ConvexError('You already have a pending seller application')
    }

    const timestamp = now()

    if (args.address !== undefined || applicant.phone !== trimmedContactPhone) {
      await ctx.db.patch(applicant._id, {
        phone: trimmedContactPhone,
        address: args.address ?? applicant.address,
        updatedAt: timestamp,
      })
    }

    return await ctx.db.insert('sellerApplications', {
      applicantId: applicant._id,
      status: 'pending',
      businessName: args.businessName.trim(),
      operatingDistrict: args.operatingDistrict.trim(),
      contactPhone: trimmedContactPhone,
      experienceSummary: args.experienceSummary.trim(),
      inventoryPlan: args.inventoryPlan.trim(),
      motivation: args.motivation.trim(),
      submittedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  },
})

export const approveSellerApplication = mutation({
  args: {
    applicationId: v.id('sellerApplications'),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const application = await ctx.db.get(args.applicationId)
    if (!application) {
      throw new ConvexError('Application not found')
    }
    if (application.status !== 'pending') {
      throw new ConvexError('Only pending applications can be approved')
    }

    const applicant = await ctx.db.get(application.applicantId)
    if (!applicant) {
      throw new ConvexError('Applicant not found')
    }

    const reviewedAt = now()

    await ctx.db.patch(application._id, {
      status: 'approved',
      reviewedAt,
      reviewedBy: admin._id,
      reviewNotes: args.reviewNotes?.trim() || undefined,
      updatedAt: reviewedAt,
    })

    await ctx.db.patch(applicant._id, {
      role: 'seller',
      updatedAt: reviewedAt,
    })

    return await ctx.db.get(application._id)
  },
})

export const rejectSellerApplication = mutation({
  args: {
    applicationId: v.id('sellerApplications'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const application = await ctx.db.get(args.applicationId)
    if (!application) {
      throw new ConvexError('Application not found')
    }
    if (application.status !== 'pending') {
      throw new ConvexError('Only pending applications can be rejected')
    }

    const reason = args.reason.trim()
    if (!reason) {
      throw new ConvexError('Rejection reason is required')
    }

    const reviewedAt = now()

    await ctx.db.patch(application._id, {
      status: 'rejected',
      reviewedAt,
      reviewedBy: admin._id,
      reviewNotes: reason,
      updatedAt: reviewedAt,
    })

    return await ctx.db.get(application._id)
  },
})

export const listSellersPublic = query({
  args: {
    limit: v.optional(v.number()),
    listingPreviewLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(100, Math.max(1, args.limit ?? 50))
    const listingPreviewLimit = Math.min(
      5,
      Math.max(1, args.listingPreviewLimit ?? 3),
    )
    const sellers = await ctx.db
      .query('users')
      .withIndex('by_role', (q) => q.eq('role', 'seller'))
      .take(limit)

    const activeSellers = sellers.filter((seller) => seller.isActive)
    if (activeSellers.length === 0) {
      return []
    }

    const activeSellerIds = new Set(activeSellers.map((seller) => seller._id))
    const liveListings = await ctx.db
      .query('vehicles')
      .withIndex('by_status', (q) => q.eq('status', 'live'))
      .collect()

    const listingsBySeller = new Map<
      (typeof activeSellers)[number]['_id'],
      Array<(typeof liveListings)[number]>
    >()

    for (const listing of liveListings) {
      if (!activeSellerIds.has(listing.sellerId)) {
        continue
      }
      const existing = listingsBySeller.get(listing.sellerId) ?? []
      existing.push(listing)
      listingsBySeller.set(listing.sellerId, existing)
    }

    for (const sellerListings of listingsBySeller.values()) {
      sellerListings.sort(
        (a, b) =>
          (b.publishedAt ?? b.updatedAt) - (a.publishedAt ?? a.updatedAt),
      )
    }

    const decorated = await Promise.all(
      activeSellers.map(async (seller) => {
        const sellerListings = listingsBySeller.get(seller._id) ?? []
        const previewBase = sellerListings.slice(0, listingPreviewLimit)

        const previewListings = await Promise.all(
          previewBase.map(async (listing) => {
            const coverImage = await ctx.db
              .query('vehicleImages')
              .withIndex('by_vehicleId', (q) => q.eq('vehicleId', listing._id))
              .first()

            return {
              _id: listing._id,
              title: listing.title,
              make: listing.make,
              model: listing.model,
              year: listing.year,
              locationDistrict: listing.locationDistrict,
              priceNpr: listing.priceNpr,
              mileage: listing.mileage,
              views: listing.views,
              likes: listing.likes,
              publishedAt: listing.publishedAt,
              updatedAt: listing.updatedAt,
              coverImageUrl: coverImage
                ? await ctx.storage.getUrl(coverImage.storageId)
                : null,
            }
          }),
        )

        const liveListingCount = sellerListings.length
        const totalListingViews = sellerListings.reduce(
          (sum, listing) => sum + listing.views,
          0,
        )
        const totalListingLikes = sellerListings.reduce(
          (sum, listing) => sum + listing.likes,
          0,
        )
        const averageLivePriceNpr =
          liveListingCount > 0
            ? Math.round(
                sellerListings.reduce((sum, listing) => sum + listing.priceNpr, 0) /
                  liveListingCount,
              )
            : null

        return {
          _id: seller._id,
          name: seller.name,
          email: seller.email,
          phone: seller.phone,
          address: seller.address,
          avatarUrl: seller.avatarUrl,
          createdAt: seller.createdAt,
          liveListingCount,
          totalListingViews,
          totalListingLikes,
          averageLivePriceNpr,
          mostRecentPublishAt:
            sellerListings[0]?.publishedAt ?? sellerListings[0]?.updatedAt ?? null,
          previewListings,
        }
      }),
    )

    return decorated.sort((a, b) => {
      if (b.liveListingCount !== a.liveListingCount) {
        return b.liveListingCount - a.liveListingCount
      }

      const recentDelta = (b.mostRecentPublishAt ?? 0) - (a.mostRecentPublishAt ?? 0)
      if (recentDelta !== 0) {
        return recentDelta
      }

      return a.name.localeCompare(b.name)
    })
  },
})
