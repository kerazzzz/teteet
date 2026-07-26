import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const role = v.union(v.literal('buyer'), v.literal('seller'), v.literal('admin'))

const listingStatus = v.union(
  v.literal('draft'),
  v.literal('pending_approval'),
  v.literal('live'),
  v.literal('rejected'),
  v.literal('sold'),
  v.literal('archived'),
)

const transactionStatus = v.union(
  v.literal('initiated'),
  v.literal('payment_pending'),
  v.literal('paid'),
  v.literal('document_generated'),
  v.literal('completed'),
  v.literal('cancelled'),
  v.literal('failed'),
)

const paymentProvider = v.union(v.literal('esewa'), v.literal('khalti'))

const reviewModerationStatus = v.union(
  v.literal('visible'),
  v.literal('flagged'),
  v.literal('hidden'),
)

const financeLeadStatus = v.union(
  v.literal('new'),
  v.literal('contacted'),
  v.literal('approved'),
  v.literal('rejected'),
  v.literal('closed'),
)

const fuelType = v.union(
  v.literal('petrol'),
  v.literal('diesel'),
  v.literal('electric'),
  v.literal('hybrid'),
)

const transmission = v.union(v.literal('manual'), v.literal('automatic'))

const vehicleCondition = v.union(v.literal('new'), v.literal('used'))

const newsStatus = v.union(v.literal('draft'), v.literal('published'))

const legalDocumentType = v.union(
  v.literal('bill_of_sale'),
  v.literal('ownership_transfer'),
)

const sellerApplicationStatus = v.union(
  v.literal('pending'),
  v.literal('approved'),
  v.literal('rejected'),
)

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role,
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerkId', ['clerkId'])
    .index('by_email', ['email'])
    .index('by_role', ['role']),

  vehicles: defineTable({
    sellerId: v.id('users'),
    title: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    fuelType,
    transmission,
    mileage: v.number(),
    engineCapacityCc: v.optional(v.number()),
    locationDistrict: v.string(),
    condition: vehicleCondition,
    priceNpr: v.number(),
    description: v.string(),
    status: listingStatus,
    rejectionReason: v.optional(v.string()),
    inspectionReportId: v.optional(v.id('inspectionReports')),
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
    soldAt: v.optional(v.number()),
    views: v.number(),
    likes: v.number(),
  })
    .index('by_seller_status', ['sellerId', 'status'])
    .index('by_status', ['status'])
    .index('by_status_publishedAt', ['status', 'publishedAt'])
    .index('by_make_model', ['make', 'model'])
    .index('by_location', ['locationDistrict']),

  vehicleImages: defineTable({
    vehicleId: v.id('vehicles'),
    storageId: v.id('_storage'),
    isPrimary: v.boolean(),
    createdAt: v.number(),
  }).index('by_vehicleId', ['vehicleId']),

  inspectionReports: defineTable({
    vehicleId: v.id('vehicles'),
    reportNumber: v.optional(v.string()),
    summary: v.string(),
    conditionScore: v.number(),
    inspectorName: v.optional(v.string()),
    issuedAt: v.number(),
    documentStorageId: v.optional(v.id('_storage')),
    createdAt: v.number(),
  }).index('by_vehicleId', ['vehicleId']),

  priceEvaluations: defineTable({
    vehicleId: v.optional(v.id('vehicles')),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    condition: vehicleCondition,
    locationDistrict: v.optional(v.string()),
    averagePriceNpr: v.number(),
    minPriceNpr: v.number(),
    maxPriceNpr: v.number(),
    confidence: v.number(),
    createdAt: v.number(),
  })
    .index('by_vehicleId', ['vehicleId'])
    .index('by_make_model_year', ['make', 'model', 'year']),

  comparisons: defineTable({
    userId: v.id('users'),
    vehicleIds: v.array(v.id('vehicles')),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),

  chats: defineTable({
    listingId: v.id('vehicles'),
    buyerId: v.id('users'),
    sellerId: v.id('users'),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_buyer', ['buyerId'])
    .index('by_seller', ['sellerId'])
    .index('by_listing_buyer_seller', ['listingId', 'buyerId', 'sellerId']),

  messages: defineTable({
    chatId: v.id('chats'),
    senderId: v.id('users'),
    body: v.string(),
    isReadByRecipient: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_chat_createdAt', ['chatId', 'createdAt'])
    .index('by_chat_read', ['chatId', 'isReadByRecipient']),

  transactions: defineTable({
    vehicleId: v.id('vehicles'),
    buyerId: v.id('users'),
    sellerId: v.id('users'),
    amountNpr: v.number(),
    status: transactionStatus,
    paymentProvider: v.optional(paymentProvider),
    paymentReference: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_buyer_createdAt', ['buyerId', 'createdAt'])
    .index('by_seller_createdAt', ['sellerId', 'createdAt'])
    .index('by_status', ['status'])
    .index('by_vehicle', ['vehicleId'])
    .index('by_paymentReference', ['paymentReference']),

  paymentEvents: defineTable({
    transactionId: v.id('transactions'),
    provider: paymentProvider,
    eventId: v.string(),
    rawPayload: v.string(),
    normalizedStatus: v.string(),
    createdAt: v.number(),
  })
    .index('by_transaction_createdAt', ['transactionId', 'createdAt'])
    .index('by_provider_eventId', ['provider', 'eventId']),

  legalDocuments: defineTable({
    transactionId: v.id('transactions'),
    documentType: legalDocumentType,
    storageId: v.id('_storage'),
    fileName: v.string(),
    createdAt: v.number(),
  }).index('by_transaction', ['transactionId']),

  reviews: defineTable({
    transactionId: v.id('transactions'),
    listingId: v.id('vehicles'),
    fromUserId: v.id('users'),
    toUserId: v.id('users'),
    rating: v.number(),
    comment: v.optional(v.string()),
    moderationStatus: reviewModerationStatus,
    createdAt: v.number(),
  })
    .index('by_toUserId', ['toUserId'])
    .index('by_listingId', ['listingId'])
    .index('by_transaction_from', ['transactionId', 'fromUserId']),

  financingOptions: defineTable({
    institutionName: v.string(),
    loanType: v.string(),
    minLoanAmountNpr: v.number(),
    maxLoanAmountNpr: v.number(),
    interestRateAnnual: v.number(),
    minTenureMonths: v.number(),
    maxTenureMonths: v.number(),
    processingFeeNpr: v.number(),
    eligibilityCriteria: v.string(),
    requiredDocuments: v.string(),
    contactDetails: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_isActive', ['isActive']),

  financingLeads: defineTable({
    userId: v.id('users'),
    vehicleId: v.optional(v.id('vehicles')),
    financingOptionId: v.optional(v.id('financingOptions')),
    requestedAmountNpr: v.number(),
    tenureMonths: v.number(),
    monthlyIncomeNpr: v.number(),
    fullName: v.string(),
    phone: v.string(),
    email: v.string(),
    notes: v.optional(v.string()),
    status: financeLeadStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_status', ['status']),

  newsPosts: defineTable({
    title: v.string(),
    slug: v.string(),
    summary: v.string(),
    content: v.string(),
    imageStorageId: v.optional(v.id('_storage')),
    status: newsStatus,
    createdBy: v.id('users'),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_status_publishedAt', ['status', 'publishedAt'])
    .index('by_slug', ['slug']),

  searchHistory: defineTable({
    userId: v.id('users'),
    query: v.string(),
    filters: v.string(),
    createdAt: v.number(),
  }).index('by_user_createdAt', ['userId', 'createdAt']),

  notifications: defineTable({
    userId: v.id('users'),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index('by_user_read_createdAt', ['userId', 'isRead', 'createdAt']),

  auditLogs: defineTable({
    adminUserId: v.id('users'),
    action: v.string(),
    targetTable: v.string(),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_admin_createdAt', ['adminUserId', 'createdAt'])
    .index('by_action', ['action']),

  sellerApplications: defineTable({
    applicantId: v.id('users'),
    status: sellerApplicationStatus,
    businessName: v.string(),
    operatingDistrict: v.string(),
    contactPhone: v.string(),
    experienceSummary: v.string(),
    inventoryPlan: v.string(),
    motivation: v.string(),
    submittedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id('users')),
    reviewNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_applicant_createdAt', ['applicantId', 'createdAt'])
    .index('by_applicant_status', ['applicantId', 'status'])
    .index('by_status_createdAt', ['status', 'createdAt']),
})
