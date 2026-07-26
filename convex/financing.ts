import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/auth'
import { now } from './lib/time'

export const listOptions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('financingOptions')
      .withIndex('by_isActive', (q) => q.eq('isActive', true))
      .collect()
  },
})

export const calculateEmi = query({
  args: {
    principalNpr: v.number(),
    annualRatePct: v.number(),
    tenureMonths: v.number(),
  },
  handler: async (_, args) => {
    const monthlyRate = args.annualRatePct / 12 / 100
    const n = args.tenureMonths

    if (monthlyRate === 0) {
      return {
        monthlyInstallmentNpr: args.principalNpr / n,
        totalRepaymentNpr: args.principalNpr,
        totalInterestNpr: 0,
      }
    }

    const emi =
      (args.principalNpr * monthlyRate * (1 + monthlyRate) ** n) /
      ((1 + monthlyRate) ** n - 1)

    const totalRepayment = emi * n

    return {
      monthlyInstallmentNpr: emi,
      totalRepaymentNpr: totalRepayment,
      totalInterestNpr: totalRepayment - args.principalNpr,
    }
  },
})

export const submitLead = mutation({
  args: {
    vehicleId: v.optional(v.id('vehicles')),
    financingOptionId: v.optional(v.id('financingOptions')),
    requestedAmountNpr: v.number(),
    tenureMonths: v.number(),
    monthlyIncomeNpr: v.number(),
    fullName: v.string(),
    phone: v.string(),
    email: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    return await ctx.db.insert('financingLeads', {
      userId: user._id,
      vehicleId: args.vehicleId,
      financingOptionId: args.financingOptionId,
      requestedAmountNpr: args.requestedAmountNpr,
      tenureMonths: args.tenureMonths,
      monthlyIncomeNpr: args.monthlyIncomeNpr,
      fullName: args.fullName,
      phone: args.phone,
      email: args.email,
      notes: args.notes,
      status: 'new',
      createdAt: now(),
      updatedAt: now(),
    })
  },
})

export const listMyLeads = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)

    if (user.role === 'admin') {
      return await ctx.db.query('financingLeads').order('desc').take(200)
    }

    return await ctx.db
      .query('financingLeads')
      .withIndex('by_user_createdAt', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect()
  },
})
