import express from "express";
import cors from "cors";
import { createHandler } from "graphql-http/lib/use/express";
import { buildSchema } from "graphql";
import { prisma } from "./lib/prisma.js";
import "dotenv/config";

const app = express();

app.use(cors());
const schema = buildSchema(`
  enum PropertyStatus {
    DRAFT
    COMING_SOON
    ON_SALE
    SOLD_OUT
    OFFLINE
  }

  enum PropertyStage {
    PLANNING
    UNDER_CONSTRUCTION
    READY_TO_MOVE
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    createdAt: String!
  }

  type PropertyMedia {
    id: ID!
    url: String!
    type: String!
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
    value: Float!
    growthPercent: Float
  }

  type Property {
    id: ID!
    name: String!
    location: String!
    county: String!
    address: String!
    postalCode: String!

    type: String!
    saleType: String!

    status: PropertyStatus!
    stage: PropertyStage!

    priceMin: Float!
    priceMax: Float!

    bedroomsMin: Int!
    bedroomsMax: Int!

    bathroomsMin: Int!
    bathroomsMax: Int!

    sizeSqm: Int!
    sizeCategory: String

    completionYear: Int

    description: String

    agent: User

    media: [PropertyMedia!]!
    features: [Feature!]!
    valueHistory: [PropertyValueHistory!]!

    listedDate: String
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    properties: [Property!]!
    property(id: ID!): Property
  }
`);

const root = {
  properties: async () => {
  const properties = await prisma.property.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      agent: true,
      media: true,
      features: {
        include: {
          feature: true,
        },
      },
      valueHistory: {
        orderBy: {
          year: "asc",
        },
      },
    },
  });

  return properties.map((property) => ({
    ...property,
    features: property.features.map((item) => item.feature),
  }));
},
  property: async ({ id }: { id: string }) => {
  const property = await prisma.property.findUnique({
    where: {
      id,
    },
    include: {
      agent: true,
      media: true,
      features: {
        include: {
          feature: true,
        },
      },
      valueHistory: {
        orderBy: {
          year: "asc",
        },
      },
    },
  });

  if (!property) {
    return null;
  }

  return {
    ...property,
    features: property.features.map((item) => item.feature),
  };
},
};
app.all(
  "/graphql",
  createHandler({
    schema,
    rootValue: root,
  })
);

app.get("/", async (_req, res) => {
  try {
    const propertyCount = await prisma.property.count();

    res.json({
      message: "Harborstone backend is running",
      database: "connected",
      properties: propertyCount,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
});