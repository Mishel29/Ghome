import { useEffect, useState } from "react";
import { getProperties, type Property } from "./graphql";

export default function GraphQLTest() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    getProperties(
      {
        county: "Dublin",
        minBedrooms: 2,
      },
      5,
      0
    )
      .then((result) => {
        setProperties(result.nodes);
        setTotalCount(result.totalCount);

        console.log("GraphQL → PostgreSQL result:", result);
      })
      .catch((err) => {
        console.error("GraphQL test failed:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      });
  }, []);

  if (error) {
    return (
      <div style={{ padding: 20, color: "red" }}>
        GraphQL error: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>GraphQL Connection Test</h2>

      <p>
        Matching properties: <strong>{totalCount}</strong>
      </p>

      {properties.map((property) => (
        <div key={property.id}>
          {property.name} — {property.county} — {property.bedroomsMin} beds
        </div>
      ))}
    </div>
  );
}