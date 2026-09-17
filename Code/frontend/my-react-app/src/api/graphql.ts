const GRAPHQL_URL = "http://localhost:4000/graphql";

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{
    message: string;
  }>;
};

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  if (!result.data) {
    throw new Error("GraphQL returned no data");
  }

  return result.data;
}
export type Property = {
  id: string;
  name: string;
  location: string;
  county: string;
  address: string;
  postalCode: string;

  type: string;
  saleType: string;

  status: string;
  stage: string;

  priceMin: number;
  priceMax: number;

  bedroomsMin: number;
  bedroomsMax: number;

  bathroomsMin: number;
  bathroomsMax: number;

  sizeSqm: number;
  sizeCategory: string | null;

  completionYear: number | null;

  description: string | null;

  agent: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;

  media: Array<{
    id: string;
    url: string;
    type: string;
    isPrimary: boolean;
    sortOrder: number;
  }>;

  features: Array<{
    id: string;
    name: string;
  }>;

  valueHistory: Array<{
    id: string;
    year: number;
    value: number;
    growthPercent: number | null;
  }>;

  listedDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PropertyFilter = {
  search?: string;
  county?: string;
  status?: string;
  stage?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
};

export type PropertyConnection = {
  nodes: Property[];
  totalCount: number;
};

const GET_PROPERTIES = `
  query GetProperties(
    $filter: PropertyFilterInput
    $limit: Int
    $offset: Int
  ) {
    properties(
      filter: $filter
      limit: $limit
      offset: $offset
    ) {
      totalCount

      nodes {
        id
        name
        location
        county
        address
        postalCode

        type
        saleType

        status
        stage

        priceMin
        priceMax

        bedroomsMin
        bedroomsMax

        bathroomsMin
        bathroomsMax

        sizeSqm
        sizeCategory

        completionYear

        description

        agent {
          id
          name
          email
          role
        }

        media {
          id
          url
          type
          isPrimary
          sortOrder
        }

        features {
          id
          name
        }

        valueHistory {
          id
          year
          value
          growthPercent
        }

        listedDate
        createdAt
        updatedAt
      }
    }
  }
`;

export async function getProperties(
  filter?: PropertyFilter,
  limit = 20,
  offset = 0
): Promise<PropertyConnection> {
  const data = await graphqlRequest<{
    properties: PropertyConnection;
  }>(GET_PROPERTIES, {
    filter,
    limit,
    offset,
  });

  return data.properties;
}