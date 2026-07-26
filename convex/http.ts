import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'

const http = httpRouter()

http.route({
  path: '/payments/esewa/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json()
      const result = await ctx.runMutation(api.payments.handleEsewaWebhook, {
        payload,
      })
      return Response.json(result)
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Invalid payload' },
        { status: 400 },
      )
    }
  }),
})

http.route({
  path: '/payments/khalti/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json()
      const result = await ctx.runMutation(api.payments.handleKhaltiWebhook, {
        payload,
      })
      return Response.json(result)
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Invalid payload' },
        { status: 400 },
      )
    }
  }),
})

export default http
