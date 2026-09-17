Login 
query UserRole {
  USER
  ADMIN
}

Properties 

PropertyStatus {
  DRAFT
  COMING_SOON
  ON_SALE
  SOLD_OUT
  OFFLINE
}

PropertyStage {
  PLANNING
  UNDER_CONSTRUCTION
  READY_TO_MOVE
}


CampaignStatus {
  DRAFT
  SENT
  FAILED
}
CampaignEventType {
  SENT
  FAILED
  OPENED
  CLICKED
  INTEREST
  SAVED
  UNSUBSCRIBED
}
type User {
  id: ID!
  name: String!
  email: String!
  role: UserRole!
  createdAt: DateTime!
}

type Property {
  id: ID!
  name: String!
  location: String!
  county: String!
  address: String!
  type: String!
  status: PropertyStatus!
  stage: PropertyStage!

  priceMin: Decimal!
  priceMax: Decimal!
  bedroomsMin: Int!
  bedroomsMax: Int!
  bathroomsMin: Int!
  bathroomsMax: Int!
  sqftMin: Int
  sqftMax: Int

  description: String
  agent: User
  media: [PropertyMedia!]!
  features: [Feature!]!
  valueHistory: [PropertyValueHistory!]!

  interestCount: Int!
  clickCount: Int!
  saveCount: Int!

  listedDate: Date
  createdAt: DateTime!
  updatedAt: DateTime!
}

type PropertyMedia {
  id: ID!
  url: String!
  type: MediaType!
  isPrimary: Boolean!
  sortOrder: Int!
}

type Feature {
  id: ID!
  name: String!
}

type PropertyValueHistory {
  id: ID!
  year: Int!
  value: Decimal!
  growthPercent: Decimal
}

type Interest {
  id: ID!
  property: Property!
  user: User
  name: String!
  email: String!
  phone: String
  message: String
  agent: User
  dataConsent: Boolean!
  followUpSent: Boolean!
  createdAt: DateTime!
}

type Subscriber {
  id: ID!
  name: String!
  email: String!
  phone: String
  subscribedAt: DateTime!
  unsubscribedAt: DateTime
  isActive: Boolean!
}

type Campaign {
  id: ID!
  subject: String!
  status: CampaignStatus!
  templateHtml: String
  createdBy: User
  properties: [Property!]!
  events: [CampaignEvent!]!
  sentAt: DateTime
  createdAt: DateTime!
}

type CampaignEvent {
  id: ID!
  campaign: Campaign!
  subscriber: Subscriber
  property: Property
  type: CampaignEventType!
  occurredAt: DateTime!
}

type NewsArticle {
  id: ID!
  title: String!
  summary: String
  content: String
  imageUrl: String
  published: Boolean!
  publishDate: Date
  relatedProperties: [Property!]!
  createdBy: User
  createdAt: DateTime!
}

type PropertyConnection {
  nodes: [Property!]!
  totalCount: Int!
}

type CampaignStats {
  emailsSent: Int!
  emailsFailed: Int!
  opens: Int!
  clicks: Int!
  interests: Int!
  saves: Int!
  unsubscribes: Int!
  clickRate: Decimal!
  interestRate: Decimal!
}

input PropertyFilterInput {
  search: String
  county: String
  status: PropertyStatus
  stage: PropertyStage
  minPrice: Decimal
  maxPrice: Decimal
  minBedrooms: Int
  maxBedrooms: Int
}

input PropertyMediaInput {
  url: String!
  type: MediaType!
  isPrimary: Boolean = false
  sortOrder: Int = 0
}

input CreatePropertyInput {
  name: String!
  location: String!
  county: String!
  address: String!
  type: String!
  status: PropertyStatus = DRAFT
  stage: PropertyStage!
  priceMin: Decimal!
  priceMax: Decimal!
  bedroomsMin: Int!
  bedroomsMax: Int!
  bathroomsMin: Int!
  bathroomsMax: Int!
  sqftMin: Int
  sqftMax: Int
  description: String
  agentId: ID
  listedDate: Date
  media: [PropertyMediaInput!]
  featureNames: [String!]
}

input UpdatePropertyInput {
  name: String
  location: String
  county: String
  address: String
  type: String
  status: PropertyStatus
  stage: PropertyStage
  priceMin: Decimal
  priceMax: Decimal
  bedroomsMin: Int
  bedroomsMax: Int
  bathroomsMin: Int
  bathroomsMax: Int
  sqftMin: Int
  sqftMax: Int
  description: String
  agentId: ID
  listedDate: Date
  media: [PropertyMediaInput!]
  featureNames: [String!]
}

input CreateInterestInput {
  propertyId: ID!
  name: String!
  email: String!
  phone: String
  message: String
  dataConsent: Boolean!
}

input CreateSubscriberInput {
  name: String!
  email: String!
  phone: String
}

input CreateCampaignInput {
  subject: String!
  templateHtml: String
  propertyIds: [ID!]!
}

input CampaignFilterInput {
  status: CampaignStatus
  from: Date
  to: Date
}

input CreateNewsArticleInput {
  title: String!
  summary: String
  content: String
  imageUrl: String
  publishDate: Date
  propertyIds: [ID!]
  published: Boolean = false
}

type Query {
  me: User

  properties(
    filter: PropertyFilterInput
    limit: Int = 20
    offset: Int = 0
  ): PropertyConnection!

  property(id: ID!): Property

  interests(
    propertyId: ID
    agentId: ID
    from: Date
    to: Date
    pendingOnly: Boolean
  ): [Interest!]!

  subscribers(activeOnly: Boolean): [Subscriber!]!

  campaigns(filter: CampaignFilterInput): [Campaign!]!
  campaignStats(campaignId: ID!): CampaignStats!

  newsArticles(publishedOnly: Boolean = true): [NewsArticle!]!
}

type Mutation {
  createProperty(input: CreatePropertyInput!): Property!
  updateProperty(id: ID!, input: UpdatePropertyInput!): Property!
  deleteProperty(id: ID!): Boolean!
  publishProperty(id: ID!): Property!

  createInterest(input: CreateInterestInput!): Interest!
  markInterestFollowUpSent(id: ID!): Interest!

  createSubscriber(input: CreateSubscriberInput!): Subscriber!
  unsubscribeSubscriber(id: ID!): Subscriber!

  createCampaign(input: CreateCampaignInput!): Campaign!
  sendCampaign(id: ID!): Campaign!

  createNewsArticle(input: CreateNewsArticleInput!): NewsArticle!
  updateNewsArticle(
    id: ID!
    input: CreateNewsArticleInput!
  ): NewsArticle!
  deleteNewsArticle(id: ID!): Boolean!
  publishNewsArticle(id: ID!): NewsArticle!
}