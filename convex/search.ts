import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/auth'
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

const sortByValidator = v.union(
  v.literal('newest'),
  v.literal('priceAsc'),
  v.literal('priceDesc'),
  v.literal('mileageAsc'),
  v.literal('yearDesc'),
)

export const searchVehicles = query({
  args: {
    query: v.optional(v.string()),
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
    const q = args.query?.trim().toLowerCase() ?? ''
    const page = Math.max(1, args.page ?? 1)
    const pageSize = Math.min(50, Math.max(1, args.pageSize ?? 12))

    let listings = await ctx.db
      .query('vehicles')
      .withIndex('by_status', (idx) => idx.eq('status', 'live'))
      .collect()

    listings = listings.filter((item) => {
      if (q) {
        const haystack = `${item.title} ${item.make} ${item.model} ${item.locationDistrict} ${item.description}`.toLowerCase()
        if (!haystack.includes(q)) return false
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
    listings.sort((a, b) => {
      if (sortBy === 'priceAsc') return a.priceNpr - b.priceNpr
      if (sortBy === 'priceDesc') return b.priceNpr - a.priceNpr
      if (sortBy === 'mileageAsc') return a.mileage - b.mileage
      if (sortBy === 'yearDesc') return b.year - a.year
      return (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt)
    })

    const total = listings.length
    const start = (page - 1) * pageSize
    const pageItems = listings.slice(start, start + pageSize)

    const items = await Promise.all(
      pageItems.map(async (listing) => {
        const primaryImage = await ctx.db
          .query('vehicleImages')
          .withIndex('by_vehicleId', (q) => q.eq('vehicleId', listing._id))
          .first()
        const coverImageUrl = primaryImage
          ? await ctx.storage.getUrl(primaryImage.storageId)
          : null

        return {
          ...listing,
          coverImageUrl,
        }
      }),
    )

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  },
})

export const getMarketplaceHighlights = query({
  args: {},
  handler: async (ctx) => {
    const [liveListings, sellers] = await Promise.all([
      ctx.db
        .query('vehicles')
        .withIndex('by_status', (idx) => idx.eq('status', 'live'))
        .collect(),
      ctx.db
        .query('users')
        .withIndex('by_role', (q) => q.eq('role', 'seller'))
        .collect(),
    ])

    const activeSellers = sellers.filter((seller) => seller.isActive)
    const districtSet = new Set(liveListings.map((listing) => listing.locationDistrict))
    const averagePriceNpr = liveListings.length
      ? Math.round(
          liveListings.reduce((sum, listing) => sum + listing.priceNpr, 0) /
            liveListings.length,
        )
      : 0

    const latestListings = [...liveListings]
      .sort((a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt))
      .slice(0, 6)

    const decoratedLatest = await Promise.all(
      latestListings.map(async (listing) => {
        const primaryImage = await ctx.db
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
          coverImageUrl: primaryImage
            ? await ctx.storage.getUrl(primaryImage.storageId)
            : null,
        }
      }),
    )

    return {
      liveListingCount: liveListings.length,
      activeSellerCount: activeSellers.length,
      districtCoverageCount: districtSet.size,
      averagePriceNpr,
      latestListings: decoratedLatest,
    }
  },
})

export const recordSearch = mutation({
  args: {
    query: v.string(),
    filters: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    return await ctx.db.insert('searchHistory', {
      userId: user._id,
      query: args.query,
      filters: args.filters,
      createdAt: now(),
    })
  },
})

export const getRecentSearches = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const limit = Math.min(50, Math.max(1, args.limit ?? 20))

    const rows = await ctx.db
      .query('searchHistory')
      .withIndex('by_user_createdAt', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(limit)

    return rows
  },
})
