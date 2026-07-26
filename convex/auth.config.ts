const rawClerkIssuer = process.env.CLERK_JWT_ISSUER_DOMAIN

if (!rawClerkIssuer) {
  throw new Error('Missing CLERK_JWT_ISSUER_DOMAIN for Convex Clerk auth config')
}

const clerkIssuer = rawClerkIssuer.endsWith('/')
  ? rawClerkIssuer.slice(0, -1)
  : rawClerkIssuer

export default {
  providers: [
    // Preferred path: Clerk JWT template "convex" with aud=convex.
    {
      domain: clerkIssuer,
      applicationID: 'convex',
    },
    // Fallback path: Clerk session token when template-based token is unavailable.
    {
      type: 'customJwt',
      issuer: clerkIssuer,
      jwks: `${clerkIssuer}/.well-known/jwks.json`,
      algorithm: 'RS256',
    },
  ],
}
