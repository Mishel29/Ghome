export const getAuthToken = () => sessionStorage.getItem("harborstone-token");
export const setAuthToken = (token: string | null) => token ? sessionStorage.setItem("harborstone-token", token) : sessionStorage.removeItem("harborstone-token");
const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL ?? "http://localhost:4000/graphql";

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {code?: string};
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
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
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
    if (result.errors.some((e) => e.extensions?.code === "UNAUTHENTICATED") && getAuthToken()) { setAuthToken(null); window.dispatchEvent(new Event("auth-expired")); }
    throw new Error(result.errors[0].message);
  }

  if (!result.data) {
    throw new Error("GraphQL returned no data");
  }

  return result.data;
}
import type { PropertyConnection, PropertyFilterInput } from "./schemaTypes";
export type { Property, PropertyConnection } from "./schemaTypes";
export type PropertyFilter = PropertyFilterInput;

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

        publicationStatus
        publishedAt
        slug
        developmentId
        sizeSqmMax
        bedroomOptions
        bathroomOptions
        sizeSqm
        sizeCategory

        completionYear

        description

        agent {
          id
          name
          email
          role
          createdAt
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