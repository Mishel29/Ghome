import { readFileSync } from "node:fs";
import { join } from "node:path";
import { graphql, buildSchema } from "graphql";
import { expect, it } from "vitest";

it("Campaign statistics schema excludes open metrics while retaining attributed metrics", async () => {
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
  expect(fields).toEqual(expect.arrayContaining(["clicks", "saves", "unsubscribes"]));
  expect(fields).not.toContain("opens");
  expect(fields).toContain("interests");

  const campaign = schema.getType("Campaign") as import("graphql").GraphQLObjectType;
  const campaignFields = Object.keys(campaign.getFields());
  expect(campaignFields).not.toContain("openCount");
  expect(campaignFields).toEqual(expect.arrayContaining(["clickCount", "saveCount", "interestCount"]));

  const queryFields = schema.getQueryType()!.getFields();
  expect(queryFields.campaignStats).toBeDefined();
  expect(queryFields.campaignStats.type.toString()).toBe("[CampaignDay!]!");
  expect(queryFields.campaignActivity?.type.toString()).toBe("[CampaignActivityPoint!]!");
  const campaignActivity = schema.getType("CampaignActivityPoint") as import("graphql").GraphQLObjectType;
  expect(Object.keys(campaignActivity.getFields())).toEqual(expect.arrayContaining(["timestamp", "sent", "failed", "clicks", "saves", "interests", "unsubscribes"]));
  expect(Object.keys(campaignActivity.getFields())).not.toContain("opens");

  const mutations = schema.getMutationType()!.getFields();
  expect(mutations.setPropertySaved.args.map((argument) => argument.name)).toEqual(["propertyId", "saved", "campaignToken"]);
  expect(mutations.recordCampaignSave.args.map((argument) => argument.name)).toEqual(["propertyId", "campaignToken"]);
  expect(schema.getType("InterestInput")!.toString()).toBe("InterestInput");
  const interestInput = schema.getType("InterestInput") as import("graphql").GraphQLInputObjectType;
  expect(Object.keys(interestInput.getFields())).toEqual(expect.arrayContaining(["propertyId", "name", "email", "phone", "message", "consent", "campaignToken"]));
  expect(mutations.chatWithPropertyAI.args.map((argument) => argument.name)).toEqual(["input"]);
  expect(mutations.chatWithPropertyAI.type.toString()).toBe("PropertyAssistantResult!");
  const assistantInput = schema.getType("PropertyAssistantInput") as import("graphql").GraphQLInputObjectType;
  expect(Object.keys(assistantInput.getFields())).toEqual(["message", "sessionId", "selectedPropertyId"]);
  const assistantResult = schema.getType("PropertyAssistantResult") as import("graphql").GraphQLObjectType;
  expect(Object.keys(assistantResult.getFields())).toEqual(expect.arrayContaining(["message", "properties", "sessionId", "intent", "selectedPropertyId", "filterJson", "totalCount"]));
});
