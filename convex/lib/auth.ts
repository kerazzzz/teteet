import { ConvexError } from 'convex/values'
import type { QueryCtx, MutationCtx } from '../_generated/server'
import type { Doc } from '../_generated/dataModel'

type DbCtx = Pick<QueryCtx, 'auth' | 'db'> | Pick<MutationCtx, 'auth' | 'db'>

type Identity = {
  subject: string
  email?: string
  givenName?: string
  familyName?: string
  pictureUrl?: string
}

export async function requireIdentity(ctx: DbCtx): Promise<Identity> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError('Unauthorized')
  }
  return identity as Identity
}

export async function getCurrentUser(ctx: DbCtx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }
  return await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
    .unique()
}

export async function requireUser(ctx: DbCtx): Promise<Doc<'users'>> {
  const identity = await requireIdentity(ctx)
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
    .unique()

  if (!user) {
    throw new ConvexError('User profile not initialized')
  }

  if (!user.isActive) {
    throw new ConvexError('Account is deactivated')
  }

  return user
}

export function requireRole(
  user: Doc<'users'>,
  roles: Array<'buyer' | 'seller' | 'admin'>,
) {
  if (!roles.includes(user.role)) {
    throw new ConvexError('Forbidden')
  }
}

export async function requireAdmin(ctx: DbCtx): Promise<Doc<'users'>> {
  const user = await requireUser(ctx)
  requireRole(user, ['admin'])
  return user
}
