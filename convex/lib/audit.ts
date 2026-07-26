import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { now } from './time'

export async function logAdminAction(
  ctx: MutationCtx,
  args: {
    adminUserId: Id<'users'>
    action: string
    targetTable: string
    targetId?: string
    metadata?: unknown
  },
) {
  await ctx.db.insert('auditLogs', {
    adminUserId: args.adminUserId,
    action: args.action,
    targetTable: args.targetTable,
    targetId: args.targetId,
    metadata:
      args.metadata === undefined ? undefined : JSON.stringify(args.metadata),
    createdAt: now(),
  })
}
