import { v } from 'convex/values'
import { query } from './_generated/server'

const conditionValidator = v.union(v.literal('new'), v.literal('used'))

export const evaluateVehiclePrice = query({
  args: {
    vehicleId: v.optional(v.id('vehicles')),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    condition: v.optional(conditionValidator),
    locationDistrict: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let seedVehicle = null
    if (args.vehicleId) {
      seedVehicle = await ctx.db.get(args.vehicleId)
    }

    const make = args.make ?? seedVehicle?.make
    const model = args.model ?? seedVehicle?.model
    const year = args.year ?? seedVehicle?.year
    const condition = args.condition ?? seedVehicle?.condition
    const locationDistrict = args.locationDistrict ?? seedVehicle?.locationDistrict

    if (!make || !model || !year || !condition) {
      return null
    }

    const candidates = await ctx.db
      .query('vehicles')
      .withIndex('by_status', (q) => q.eq('status', 'live'))
      .collect()

    const comparable = candidates.filter((item) => {
      const yearDiff = Math.abs(item.year - year)
      if (item.make !== make) return false
      if (item.model !== model) return false
      if (item.condition !== condition) return false
      if (yearDiff > 2) return false
      if (locationDistrict && item.locationDistrict !== locationDistrict) return false
      return true
    })

    const prices = comparable.map((c) => c.priceNpr)
    if (prices.length === 0) {
      return {
        comparableCount: 0,
        averagePriceNpr: null,
        minPriceNpr: null,
        maxPriceNpr: null,
        confidence: 0,
      }
    }

    const total = prices.reduce((sum, price) => sum + price, 0)
    const average = Math.round(total / prices.length)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const confidence = Math.min(1, prices.length / 10)

    return {
      comparableCount: prices.length,
      averagePriceNpr: average,
      minPriceNpr: min,
      maxPriceNpr: max,
      confidence,
    }
  },
})
