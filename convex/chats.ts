import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { requireRole, requireUser } from './lib/auth'
import { now } from './lib/time'

async function assertChatParticipant(
  ctx: any,
  chatId: Id<'chats'>,
  userId: Id<'users'>,
) {
  const chat = await ctx.db.get(chatId)
  if (!chat) throw new ConvexError('Chat not found')
  if (chat.buyerId !== userId && chat.sellerId !== userId) {
    throw new ConvexError('Forbidden')
  }
  return chat
}

export const createOrGetChat = mutation({
  args: {
    listingId: v.id('vehicles'),
  },
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx)
    requireRole(actor, ['buyer', 'admin'])

    const listing = await ctx.db.get(args.listingId)
    if (!listing) {
      throw new ConvexError('Listing not found')
    }

    if (actor._id === listing.sellerId) {
      throw new ConvexError('You cannot chat with yourself')
    }

    const existing = await ctx.db
      .query('chats')
      .withIndex('by_listing_buyer_seller', (q) =>
        q
          .eq('listingId', args.listingId)
          .eq('buyerId', actor._id)
          .eq('sellerId', listing.sellerId),
      )
      .first()

    if (existing) {
      return existing._id
    }

    return await ctx.db.insert('chats', {
      listingId: args.listingId,
      buyerId: actor._id,
      sellerId: listing.sellerId,
      lastMessageAt: now(),
      createdAt: now(),
      updatedAt: now(),
    })
  },
})

export const listMyChats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)

    const buyerChats = await ctx.db
      .query('chats')
      .withIndex('by_buyer', (q) => q.eq('buyerId', user._id))
      .collect()

    const sellerChats = await ctx.db
      .query('chats')
      .withIndex('by_seller', (q) => q.eq('sellerId', user._id))
      .collect()

    const unique = new Map([...buyerChats, ...sellerChats].map((c) => [c._id, c]))

    const rows = await Promise.all(
      Array.from(unique.values()).map(async (chat) => {
        const partnerId = chat.buyerId === user._id ? chat.sellerId : chat.buyerId
        const [partner, listing, unreadMessages] = await Promise.all([
          ctx.db.get(partnerId),
          ctx.db.get(chat.listingId),
          ctx.db
            .query('messages')
            .withIndex('by_chat_read', (q) =>
              q.eq('chatId', chat._id).eq('isReadByRecipient', false),
            )
            .collect(),
        ])

        const unreadCount = unreadMessages.filter((m) => m.senderId !== user._id).length

        return {
          ...chat,
          partner,
          listing,
          unreadCount,
        }
      }),
    )

    rows.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
    return rows
  },
})

export const sendMessage = mutation({
  args: {
    chatId: v.id('chats'),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const body = args.body.trim()
    if (!body) {
      throw new ConvexError('Message cannot be empty')
    }

    const chat = await assertChatParticipant(ctx, args.chatId, user._id)

    const messageId = await ctx.db.insert('messages', {
      chatId: chat._id,
      senderId: user._id,
      body,
      isReadByRecipient: false,
      createdAt: now(),
    })

    await ctx.db.patch(chat._id, {
      lastMessageAt: now(),
      updatedAt: now(),
    })

    return messageId
  },
})

export const listMessages = query({
  args: {
    chatId: v.id('chats'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertChatParticipant(ctx, args.chatId, user._id)

    const limit = Math.min(200, Math.max(1, args.limit ?? 100))
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat_createdAt', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(limit)

    return messages.reverse()
  },
})

export const markRead = mutation({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertChatParticipant(ctx, args.chatId, user._id)

    const unread = await ctx.db
      .query('messages')
      .withIndex('by_chat_read', (q) =>
        q.eq('chatId', args.chatId).eq('isReadByRecipient', false),
      )
      .collect()

    for (const message of unread) {
      if (message.senderId !== user._id) {
        await ctx.db.patch(message._id, {
          isReadByRecipient: true,
        })
      }
    }

    return { success: true }
  },
})
