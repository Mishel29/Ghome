import { readFileSync } from "node:fs";
import { join } from "node:path";
import { graphql, buildSchema } from "graphql";
import { expect, it } from "vitest";

it("CampaignDay schema exposes daily saves", async () => {
  const source = readFileSync(join(process.cwd(), "src", "server.ts"), "utf8");
  const match = source.match(/buildSchema\(`([\s\S]*?)`\);/);
  expect(match, "GraphQL SDL buildSchema template was not found").toBeTruthy();

  const schema = buildSchema(match![1]);
  const result = await graphql({
    schema,
    source: "{ __type(name: \"CampaignDay\") { fields { name } } }",
  });

  expect(result.errors).toBeUndefined();
  const fields = ((result.data?.__type as { fields: Array<{ name: string }> } | null)?.fields ?? []).map((field) => field.name);
  expect(fields).toContain("date");
  expect(fields).toContain("saves");
  expect(fields).toContain("interests");

  const queryFields = schema.getQueryType()!.getFields();
  expect(queryFields.campaignStats).toBeDefined();
  expect(queryFields.campaignStats.type.toString()).toBe("[CampaignDay!]!");

  const mutations = schema.getMutationType()!.getFields();
  expect(mutations.setPropertySaved.args.map((argument) => argument.name)).toEqual(["propertyId", "saved", "campaignToken"]);
  expect(mutations.recordCampaignSave.args.map((argument) => argument.name)).toEqual(["propertyId", "campaignToken"]);
  expect(schema.getType("InterestInput")!.toString()).toBe("InterestInput");
  const interestInput = schema.getType("InterestInput") as import("graphql").GraphQLInputObjectType;
  expect(Object.keys(interestInput.getFields())).toEqual(expect.arrayContaining(["propertyId", "name", "email", "phone", "message", "consent", "campaignToken"]));
});
