import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/auth'
import { now } from './lib/time'

const MAX_COMPARE = 5

export const saveComparison = mutation({
  args: {
    vehicleIds: v.array(v.id('vehicles')),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const vehicleIds = [...new Set(args.vehicleIds)]

    if (vehicleIds.length === 0) {
      throw new ConvexError('Select at least one vehicle')
    }

    if (vehicleIds.length > MAX_COMPARE) {
      throw new ConvexError(`You can compare up to ${MAX_COMPARE} vehicles`) 
    }

    const existing = await ctx.db
      .query('comparisons')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        vehicleIds,
        updatedAt: now(),
      })
      return existing._id
    }

    return await ctx.db.insert('comparisons', {
      userId: user._id,
      vehicleIds,
      createdAt: now(),
      updatedAt: now(),
    })
  },
})

export const getCurrentComparison = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)

    const comparison = await ctx.db
      .query('comparisons')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .first()

    if (!comparison) {
      return null
    }

    const vehicles = (
      await Promise.all(comparison.vehicleIds.map((vehicleId) => ctx.db.get(vehicleId)))
    ).filter(Boolean)

    return {
      comparison,
      vehicles,
    }
  },
})

export const clearComparison = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const existing = await ctx.db
      .query('comparisons')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    for (const row of existing) {
      await ctx.db.delete(row._id)
    }

    return { success: true }
  },
})
