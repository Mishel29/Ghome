export type PropertyFilterAgent = { id: string; name: string };

export type PropertyFilterOptionSource = {
  propertyTypes: Array<string | null | undefined>;
  saleTypes: Array<string | null | undefined>;
  counties: Array<string | null | undefined>;
  locations: Array<string | null | undefined>;
  sizeCategories: Array<string | null | undefined>;
  bedrooms: Array<number | null | undefined>;
  bathrooms: Array<number | null | undefined>;
  agents: Array<PropertyFilterAgent | null | undefined>;
};

function textOptions(values: Array<string | null | undefined>) {
  const options = new Map<string, string>();
  for (const value of values) {
    const display = value?.trim().replace(/\s+/g, " ");
    if (!display) continue;
    const key = display.toLocaleLowerCase("en-IE");
    if (!options.has(key)) options.set(key, display);
  }
  return [...options.values()].sort((left, right) => left.localeCompare(right, "en-IE", { sensitivity: "base" }));
}

function numberOptions(values: Array<number | null | undefined>) {
  return [...new Set(values.filter((value): value is number => Number.isFinite(value)))].sort((left, right) => left - right);
}

function agentOptions(values: Array<PropertyFilterAgent | null | undefined>) {
  const options = new Map<string, PropertyFilterAgent>();
  for (const agent of values) {
    const name = agent?.name.trim().replace(/\s+/g, " ");
    if (agent && name && !options.has(agent.id)) options.set(agent.id, { id: agent.id, name });
  }
  return [...options.values()].sort((left, right) => left.name.localeCompare(right.name, "en-IE", { sensitivity: "base" }) || left.id.localeCompare(right.id));
}

export function buildPropertyFilterOptions(source: PropertyFilterOptionSource) {
  return {
    propertyTypes: textOptions(source.propertyTypes),
    saleTypes: textOptions(source.saleTypes),
    counties: textOptions(source.counties),
    locations: textOptions(source.locations),
    sizeCategories: textOptions(source.sizeCategories),
    bedrooms: numberOptions(source.bedrooms),
    bathrooms: numberOptions(source.bathrooms),
    agents: agentOptions(source.agents),
  };
}
