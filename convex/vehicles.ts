import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { logAdminAction } from './lib/audit'
import { requireAdmin, requireRole, requireUser } from './lib/auth'
import { now } from './lib/time'

const fuelTypeValidator = v.union(
  v.literal('petrol'),
  v.literal('diesel'),
  v.literal('electric'),
  v.literal('hybrid'),
)

const transmissionValidator = v.union(
  v.literal('manual'),
  v.literal('automatic'),
)

const conditionValidator = v.union(v.literal('new'), v.literal('used'))

const listingStatusValidator = v.union(
  v.literal('draft'),
  v.literal('pending_approval'),
  v.literal('live'),
  v.literal('rejected'),
  v.literal('sold'),
  v.literal('archived'),
)

const sortByValidator = v.union(
  v.literal('newest'),
  v.literal('priceAsc'),
  v.literal('priceDesc'),
  v.literal('mileageAsc'),
  v.literal('yearDesc'),
)

function ensureListingEditable(status: string) {
  if (status !== 'draft' && status !== 'rejected') {
    throw new ConvexError('Listing can only be edited while draft/rejected')
  }
}

function ensureOwnListingOrAdmin(
  actor: { _id: Id<'users'>; role: string },
  listing: { sellerId: Id<'users'> },
) {
  const isOwner = actor._id === listing.sellerId
  if (!isOwner && actor.role !== 'admin') {
    throw new ConvexError('Forbidden')
  }
}

export const createDraft = mutation({
  args: {
    title: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    fuelType: fuelTypeValidator,
    transmission: transmissionValidator,
    mileage: v.number(),
    engineCapacityCc: v.optional(v.number()),
    locationDistrict: v.string(),
    condition: conditionValidator,
    priceNpr: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const seller = await requireUser(ctx)
    requireRole(seller, ['seller', 'admin'])

    const listingId = await ctx.db.insert('vehicles', {
      sellerId: seller._id,
      title: args.title,
      make: args.make,
      model: args.model,
      year: args.year,
      fuelType: args.fuelType,
      transmission: args.transmission,
      mileage: args.mileage,
      engineCapacityCc: args.engineCapacityCc,
      locationDistrict: args.locationDistrict,
      condition: args.condition,
      priceNpr: args.priceNpr,
      description: args.description,
      status: 'draft',
      createdAt: now(),
      updatedAt: now(),
      views: 0,
      likes: 0,
    })

    return listingId
  },
})

export const updateDraft = mutation({
  args: {
    vehicleId: v.id('vehicles'),
    title: v.optional(v.string()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    fuelType: v.optional(fuelTypeValidator),
    transmission: v.optional(transmissionValidator),
    mileage: v.optional(v.number()),
    engineCapacityCc: v.optional(v.number()),
    locationDistrict: v.optional(v.string()),
    condition: v.optional(conditionValidator),
    priceNpr: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx)
    const listing = await ctx.db.get(args.vehicleId)
    if (!listing) {
      throw new ConvexError('Listing not found')
    }

    ensureOwnListingOrAdmin(actor, listing)
    ensureListingEditable(listing.status)

    await ctx.db.patch(args.vehicleId, {
      title: args.title ?? listing.title,
      make: args.make ?? listing.make,
      model: args.model ?? listing.model,
      year: args.year ?? listing.year,
      fuelType: args.fuelType ?? listing.fuelType,
      transmission: args.transmission ?? listing.transmission,
      mileage: args.mileage ?? listing.mileage,
      engineCapacityCc: args.engineCapacityCc ?? listing.engineCapacityCc,
      locationDistrict: args.locationDistrict ?? listing.locationDistrict,
      condition: args.condition ?? listing.condition,
      priceNpr: args.priceNpr ?? listing.priceNpr,
      description: args.description ?? listing.description,
      updatedAt: now(),
    })

    return await ctx.db.get(args.vehicleId)
  },
})

export const submitForApproval = mutation({
  args: {
    vehicleId: v.id('vehicles'),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx)
    const listing = await ctx.db.get(args.vehicleId)
    if (!listing) {
      throw new ConvexError('Listing not found')
    }

    ensureOwnListingOrAdmin(actor, listing)
    ensureListingEditable(listing.status)

    await ctx.db.patch(args.vehicleId, {
      status: 'pending_approval',
      rejectionReason: undefined,
      updatedAt: now(),
    })

    return await ctx.db.get(args.vehicleId)
  },
})

export const deleteDraft = mutation({
  args: {
    vehicleId: v.id('vehicles'),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx)
    const listing = await ctx.db.get(args.vehicleId)
    if (!listing) {
      throw new ConvexError('Listing not found')
    }

    ensureOwnListingOrAdmin(actor, listing)
    if (listing.status === 'sold') {
      throw new ConvexError('Sold listings cannot be deleted')
    }

    const images = await ctx.db
      .query('vehicleImages')
      .withIndex('by_vehicleId', (q) => q.eq('vehicleId', args.vehicleId))
      .collect()

    for (const image of images) {
      await ctx.db.delete(image._id)
    }

    await ctx.db.delete(args.vehicleId)
    return { success: true }
  },
})

export const generateImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const attachUploadedImage = mutation({
  args: {
    vehicleId: v.id('vehicles'),
    storageId: v.id('_storage'),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx)
    const listing = await ctx.db.get(args.vehicleId)
    if (!listing) {
      throw new ConvexError('Listing not found')
    }

    ensureOwnListingOrAdmin(actor, listing)
    ensureListingEditable(listing.status)

    if (args.isPrimary) {
      const existing = await ctx.db
        .query('vehicleImages')
        .withIndex('by_vehicleId', (q) => q.eq('vehicleId', args.vehicleId))
        .collect()
      for (const image of existing) {
        if (image.isPrimary) {
          await ctx.db.patch(image._id, { isPrimary: false })
        }
      }
    }

    return await ctx.db.insert('vehicleImages', {
      vehicleId: args.vehicleId,
      storageId: args.storageId,
      isPrimary: args.isPrimary ?? false,
      createdAt: now(),
    })
  },
})

export const addInspectionReport = mutation({
  args: {
    vehicleId: v.id('vehicles'),
    summary: v.string(),
    conditionScore: v.number(),
    inspectorName: v.optional(v.string()),
    reportNumber: v.optional(v.string()),
    issuedAt: v.number(),
    documentStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx)
    const listing = await ctx.db.get(args.vehicleId)
    if (!listing) {
      throw new ConvexError('Listing not found')
    }

    ensureOwnListingOrAdmin(actor, listing)

    const reportId = await ctx.db.insert('inspectionReports', {
      vehicleId: args.vehicleId,
      summary: args.summary,
      conditionScore: args.conditionScore,
      inspectorName: args.inspectorName,
      reportNumber: args.reportNumber,
      issuedAt: args.issuedAt,
      documentStorageId: args.documentStorageId,
      createdAt: now(),
    })

    await ctx.db.patch(args.vehicleId, {
      inspectionReportId: reportId,
      updatedAt: now(),
    })

    return reportId
  },
})

export const listPublic = query({
  args: {
    search: v.optional(v.string()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    locationDistrict: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    minYear: v.optional(v.number()),
    maxYear: v.optional(v.number()),
    fuelType: v.optional(fuelTypeValidator),
    transmission: v.optional(transmissionValidator),
    sortBy: v.optional(sortByValidator),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = Math.max(1, args.page ?? 1)
    const pageSize = Math.min(50, Math.max(1, args.pageSize ?? 12))
    const search = args.search?.trim().toLowerCase() ?? ''

    let items = await ctx.db
      .query('vehicles')
      .withIndex('by_status', (q) => q.eq('status', 'live'))
      .collect()

    items = items.filter((item) => {
      if (search) {
        const haystack = `${item.title} ${item.make} ${item.model} ${item.locationDistrict} ${item.description}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      if (args.make && item.make !== args.make) return false
      if (args.model && item.model !== args.model) return false
      if (args.locationDistrict && item.locationDistrict !== args.locationDistrict)
        return false
      if (args.minPrice !== undefined && item.priceNpr < args.minPrice) return false
      if (args.maxPrice !== undefined && item.priceNpr > args.maxPrice) return false
      if (args.minYear !== undefined && item.year < args.minYear) return false
      if (args.maxYear !== undefined && item.year > args.maxYear) return false
      if (args.fuelType && item.fuelType !== args.fuelType) return false
      if (args.transmission && item.transmission !== args.transmission) return false
      return true
    })

    const sortBy = args.sortBy ?? 'newest'
    items.sort((a, b) => {
      if (sortBy === 'priceAsc') return a.priceNpr - b.priceNpr
      if (sortBy === 'priceDesc') return b.priceNpr - a.priceNpr
      if (sortBy === 'mileageAsc') return a.mileage - b.mileage
      if (sortBy === 'yearDesc') return b.year - a.year
      return (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt)
    })

    const total = items.length
    const start = (page - 1) * pageSize
    const pageItems = items.slice(start, start + pageSize)

    const decorated = await Promise.all(
      pageItems.map(async (vehicle) => {
        const image = await ctx.db
          .query('vehicleImages')
          .withIndex('by_vehicleId', (q) => q.eq('vehicleId', vehicle._id))
          .first()
        const coverImageUrl = image
          ? await ctx.storage.getUrl(image.storageId)
          : null
        return {
          ...vehicle,
          coverImageStorageId: image?.storageId,
          coverImageUrl,
        }
      }),
    )

    return {
      items: decorated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  },
})

export const getById = query({
  args: {
    listingId: v.id('vehicles'),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId)
    if (!listing) {
      return null
    }

    const seller = await ctx.db.get(listing.sellerId)
    const images = await ctx.db
      .query('vehicleImages')
      .withIndex('by_vehicleId', (q) => q.eq('vehicleId', args.listingId))
      .collect()
    const imagesWithUrls = await Promise.all(
      images.map(async (image) => ({
        ...image,
        url: await ctx.storage.getUrl(image.storageId),
      })),
    )
    const inspectionReport = listing.inspectionReportId
      ? await ctx.db.get(listing.inspectionReportId)
      : null

    const evaluations = await ctx.db
      .query('priceEvaluations')
      .withIndex('by_vehicleId', (q) => q.eq('vehicleId', args.listingId))
      .collect()

    const latestEvaluation = evaluations.sort((a, b) => b.createdAt - a.createdAt)[0]

    return {
      listing,
      seller,
      images: imagesWithUrls,
      inspectionReport,
      latestEvaluation,
    }
  },
})

export const getSellerListings = query({
  args: {
    status: v.optional(listingStatusValidator),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx)
    if (args.status) {
      return await ctx.db
        .query('vehicles')
        .withIndex('by_seller_status', (q) =>
          q.eq('sellerId', actor._id).eq('status', args.status!),
        )
        .collect()
    }

    return await ctx.db
      .query('vehicles')
      .withIndex('by_seller_status', (q) => q.eq('sellerId', actor._id))
      .collect()
  },
})

export const publishByAdmin = mutation({
  args: {
    vehicleId: v.id('vehicles'),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const listing = await ctx.db.get(args.vehicleId)
    if (!listing) {
      throw new ConvexError('Listing not found')
    }
    if (listing.status !== 'pending_approval') {
      throw new ConvexError('Listing is not pending approval')
    }

    await ctx.db.patch(args.vehicleId, {
      status: 'live',
      rejectionReason: undefined,
      publishedAt: now(),
      updatedAt: now(),
    })

    await logAdminAction(ctx, {
      adminUserId: admin._id,
      action: 'listing_published',
      targetTable: 'vehicles',
      targetId: args.vehicleId,
    })

    return await ctx.db.get(args.vehicleId)
  },
})

export const rejectByAdmin = mutation({
  args: {
    vehicleId: v.id('vehicles'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const listing = await ctx.db.get(args.vehicleId)
    if (!listing) {
      throw new ConvexError('Listing not found')
    }
    if (listing.status !== 'pending_approval') {
      throw new ConvexError('Listing is not pending approval')
    }

    await ctx.db.patch(args.vehicleId, {
      status: 'rejected',
      rejectionReason: args.reason,
      updatedAt: now(),
    })

    await logAdminAction(ctx, {
      adminUserId: admin._id,
      action: 'listing_rejected',
      targetTable: 'vehicles',
      targetId: args.vehicleId,
      metadata: { reason: args.reason },
    })

    return await ctx.db.get(args.vehicleId)
  },
})

export const markSold = mutation({
  args: {
    vehicleId: v.id('vehicles'),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx)
    const listing = await ctx.db.get(args.vehicleId)
    if (!listing) {
      throw new ConvexError('Listing not found')
    }

    ensureOwnListingOrAdmin(actor, listing)
    if (listing.status !== 'live') {
      throw new ConvexError('Only live listings can be marked sold')
    }

    await ctx.db.patch(args.vehicleId, {
      status: 'sold',
      soldAt: now(),
      updatedAt: now(),
    })

    return await ctx.db.get(args.vehicleId)
  },
})

export const incrementView = mutation({
  args: {
    vehicleId: v.id('vehicles'),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.vehicleId)
    if (!listing) {
      return null
    }

    await ctx.db.patch(args.vehicleId, {
      views: listing.views + 1,
      updatedAt: now(),
    })

    return { views: listing.views + 1 }
  },
})
