-- Add an index for property-scoped historical price lookups.
CREATE INDEX "PropertyValueHistory_propertyId_idx" ON "PropertyValueHistory"("propertyId");
