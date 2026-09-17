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

  input PropertyFilterInput {
  search: String
  county: String
  status: PropertyStatus
  stage: PropertyStage
  minPrice: Float
  maxPrice: Float
  minBedrooms: Int
  maxBedrooms: Int
}

type PropertyConnection {
  nodes: [Property!]!
  totalCount: Int!
}

type Query {
  properties(
    filter: PropertyFilterInput
    limit: Int
    offset: Int
  ): PropertyConnection!

  property(id: ID!): Property
}
`);

const root = {
  properties: async ({
  filter,
  limit = 20,
  offset = 0,
}: {
  filter?: {
    search?: string;
    county?: string;
    status?: "DRAFT" | "COMING_SOON" | "ON_SALE" | "SOLD_OUT" | "OFFLINE";
    stage?: "PLANNING" | "UNDER_CONSTRUCTION" | "READY_TO_MOVE";
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
    maxBedrooms?: number;
  };
  limit?: number;
  offset?: number;
}) => {
  const where = {
    ...(filter?.search
      ? {
          OR: [
            {
              name: {
                contains: filter.search,
                mode: "insensitive" as const,
              },
            },
            {
              address: {
                contains: filter.search,
                mode: "insensitive" as const,
              },
            },
            {
              county: {
                contains: filter.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),

    ...(filter?.county
      ? {
          county: {
            equals: filter.county,
            mode: "insensitive" as const,
          },
        }
      : {}),

    ...(filter?.status
      ? {
          status: filter.status,
        }
      : {}),

    ...(filter?.stage
      ? {
          stage: filter.stage,
        }
      : {}),

    ...(filter?.minPrice !== undefined
      ? {
          priceMin: {
            gte: filter.minPrice,
          },
        }
      : {}),

    ...(filter?.maxPrice !== undefined
      ? {
          priceMax: {
            lte: filter.maxPrice,
          },
        }
      : {}),

    ...(filter?.minBedrooms !== undefined
      ? {
          bedroomsMin: {
            gte: filter.minBedrooms,
          },
        }
      : {}),

    ...(filter?.maxBedrooms !== undefined
      ? {
          bedroomsMax: {
            lte: filter.maxBedrooms,
          },
        }
      : {}),
  };

  const [properties, totalCount] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: Math.min(limit, 100),
      skip: Math.max(offset, 0),
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
    }),

    prisma.property.count({
      where,
    }),
  ]);

  return {
    nodes: properties.map((property) => ({
      ...property,
      features: property.features.map((item) => item.feature),
    })),
    totalCount,
  };
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