import { graphqlRequest } from "./graphql";
import type { PropertyImport, PropertyUpload } from "./schemaTypes";
const ERROR = "rowNumber field value message errorType";
const UPLOAD = `id filename status byteSize expiresAt validation { valid totalRows validRows invalidRows totalErrors errorsTruncated duplicateProperties { rowNumber name existingPropertyId existingPropertyName source resolution } unresolvedDuplicateCount schema { valid expectedColumns requiredColumns receivedColumns missingColumns unknownColumns duplicateColumns emptyColumns } errors { ${ERROR} } }`;
const STATUS = `id filename status createdAt startedAt completedAt adminName totalRows totalJobs completedJobs failedJobs waitingJobs activeJobs retryingJobs successfulRows failedRows percentage errorSummary queueWarning chunks { id chunkIndex totalRows processedRows status attempts lastError } rowErrors { ${ERROR} } errorCount`;
export async function uploadCsv(file: File, subscribers = false) {
  const contentBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = () => reject(new Error("Could not read this file"));
    reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.readAsDataURL(file);
  });
  if (subscribers) return (await graphqlRequest<{uploadSubscriberFile: PropertyUpload}>(`mutation($filename:String!,$contentBase64:String!){uploadSubscriberFile(filename:$filename,contentBase64:$contentBase64){${UPLOAD}}}`, {filename:file.name,contentBase64})).uploadSubscriberFile;
  return (await graphqlRequest<{uploadPropertyCsv: PropertyUpload}>(`mutation($filename:String!,$contentBase64:String!){uploadPropertyCsv(filename:$filename,contentBase64:$contentBase64){${UPLOAD}}}`, {filename:file.name,contentBase64})).uploadPropertyCsv;
}
export async function validateCsv(uploadId:string, subscribers = false) { if (subscribers) return (await graphqlRequest<{validateSubscriberCsv:PropertyUpload}>(`mutation($uploadId:ID!){validateSubscriberCsv(uploadId:$uploadId){${UPLOAD}}}`,{uploadId})).validateSubscriberCsv; return (await graphqlRequest<{validatePropertyCsv:PropertyUpload}>(`mutation($uploadId:ID!){validatePropertyCsv(uploadId:$uploadId){${UPLOAD}}}`,{uploadId})).validatePropertyCsv; }
export async function resolvePropertyDuplicates(uploadId:string,resolutions:Array<{rowNumber:number;action:"SKIP"|"REPLACE"}>){return (await graphqlRequest<{resolvePropertyImportDuplicates:PropertyUpload}>(`mutation($uploadId:ID!,$resolutions:[PropertyImportDuplicateResolutionInput!]!){resolvePropertyImportDuplicates(uploadId:$uploadId,resolutions:$resolutions){${UPLOAD}}}`,{uploadId,resolutions})).resolvePropertyImportDuplicates;}
export async function getUpload(id:string) { return (await graphqlRequest<{propertyImportUpload:PropertyUpload}>(`query($id:ID!){propertyImportUpload(id:$id){${UPLOAD}}}`,{id})).propertyImportUpload; }
export async function cancelCsv(uploadId:string) { return graphqlRequest('mutation($uploadId:ID!){cancelPropertyUpload(uploadId:$uploadId)}',{uploadId}); }
export async function startCsv(uploadId:string, subscribers = false) { if (subscribers) return (await graphqlRequest<{startSubscriberImport:PropertyImport}>(`mutation($uploadId:ID!){startSubscriberImport(uploadId:$uploadId){${STATUS}}}`,{uploadId})).startSubscriberImport; return (await graphqlRequest<{startPropertyImport:PropertyImport}>(`mutation($uploadId:ID!){startPropertyImport(uploadId:$uploadId){${STATUS}}}`,{uploadId})).startPropertyImport; }
export async function getImport(id:string,jobOffset=0,errorOffset=0) { return (await graphqlRequest<{propertyImportStatus:PropertyImport}>(`query($id:ID!,$jobOffset:Int,$errorOffset:Int){propertyImportStatus(id:$id,jobOffset:$jobOffset,errorOffset:$errorOffset){${STATUS}}}`,{id,jobOffset,errorOffset})).propertyImportStatus; }
export async function importHistory(subscribers = false) { return (await graphqlRequest<{propertyImportHistory:PropertyImport[]}>(`query{propertyImportHistory:${subscribers ? "subscriberImportHistory" : "propertyImportHistory"}{${STATUS}}}`)).propertyImportHistory; }

