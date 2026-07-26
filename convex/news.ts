import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { logAdminAction } from './lib/audit'
import { requireAdmin } from './lib/auth'
import { now } from './lib/time'

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export const listPublished = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(100, Math.max(1, args.limit ?? 20))
    const posts = await ctx.db
      .query('newsPosts')
      .withIndex('by_status_publishedAt', (q) => q.eq('status', 'published'))
      .order('desc')
      .take(limit)

    return await Promise.all(
      posts.map(async (post) => ({
        ...post,
        imageUrl: post.imageStorageId
          ? await ctx.storage.getUrl(post.imageStorageId)
          : null,
      })),
    )
  },
})

export const getPublishedBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = args.slug.trim()
    if (!slug) {
      return null
    }

    const post = await ctx.db
      .query('newsPosts')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first()

    if (!post || post.status !== 'published') {
      return null
    }

    return {
      ...post,
      imageUrl: post.imageStorageId
        ? await ctx.storage.getUrl(post.imageStorageId)
        : null,
    }
  },
})

export const listAdmin = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const limit = Math.min(200, Math.max(1, args.limit ?? 100))
    return await ctx.db.query('newsPosts').order('desc').take(limit)
  },
})

export const createDraft = mutation({
  args: {
    title: v.string(),
    summary: v.string(),
    content: v.string(),
    slug: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)

    const slugBase = args.slug?.trim() || slugify(args.title)
    const existing = await ctx.db
      .query('newsPosts')
      .withIndex('by_slug', (q) => q.eq('slug', slugBase))
      .first()

    const finalSlug = existing ? `${slugBase}-${Date.now()}` : slugBase

    const id = await ctx.db.insert('newsPosts', {
      title: args.title,
      slug: finalSlug,
      summary: args.summary,
      content: args.content,
      imageStorageId: args.imageStorageId,
      status: 'draft',
      createdBy: admin._id,
      createdAt: now(),
      updatedAt: now(),
    })

    await logAdminAction(ctx, {
      adminUserId: admin._id,
      action: 'news_created',
      targetTable: 'newsPosts',
      targetId: id,
    })

    return id
  },
})

export const publish = mutation({
  args: {
    newsId: v.id('newsPosts'),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const news = await ctx.db.get(args.newsId)
    if (!news) {
      throw new ConvexError('News post not found')
    }

    await ctx.db.patch(args.newsId, {
      status: 'published',
      publishedAt: now(),
      updatedAt: now(),
    })

    await logAdminAction(ctx, {
      adminUserId: admin._id,
      action: 'news_published',
      targetTable: 'newsPosts',
      targetId: args.newsId,
    })

    return await ctx.db.get(args.newsId)
  },
})

export const unpublish = mutation({
  args: {
    newsId: v.id('newsPosts'),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const news = await ctx.db.get(args.newsId)
    if (!news) {
      throw new ConvexError('News post not found')
    }

    await ctx.db.patch(args.newsId, {
      status: 'draft',
      publishedAt: undefined,
      updatedAt: now(),
    })

    await logAdminAction(ctx, {
      adminUserId: admin._id,
      action: 'news_unpublished',
      targetTable: 'newsPosts',
      targetId: args.newsId,
    })

    return await ctx.db.get(args.newsId)
  },
})

export const update = mutation({
  args: {
    newsId: v.id('newsPosts'),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    content: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const news = await ctx.db.get(args.newsId)
    if (!news) {
      throw new ConvexError('News post not found')
    }

    await ctx.db.patch(args.newsId, {
      title: args.title ?? news.title,
      summary: args.summary ?? news.summary,
      content: args.content ?? news.content,
      imageStorageId: args.imageStorageId ?? news.imageStorageId,
      updatedAt: now(),
    })

    await logAdminAction(ctx, {
      adminUserId: admin._id,
      action: 'news_updated',
      targetTable: 'newsPosts',
      targetId: args.newsId,
    })

    return await ctx.db.get(args.newsId)
  },
})
