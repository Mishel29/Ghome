import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cancelCsv, getImport, getUpload, importHistory, startCsv, uploadCsv, validateCsv } from "../../api/imports";
import type { ImportError, PropertyImport as ImportSession, PropertyUpload } from "../../api/schemaTypes";

const terminal = new Set(["COMPLETED", "PARTIALLY_COMPLETED", "FAILED", "CANCELLED"]);
const button = "px-4 py-2 border border-navy text-sm disabled:opacity-40 disabled:cursor-not-allowed";
const propertyCsvColumns = ["Name", "Address", "Postal Code", "County", "Price", "Sold times", "Property Type", "Status", "Stage", "Agent", "Description", "Property Size Category", "Property Size", "Beds", "Baths", "Completion Year", "Years", "Historical Prices"];
export default function PropertyImport({ subscribers = false }: { subscribers?: boolean }) {
  const [params, setParams] = useSearchParams();
  const sessionId = params.get("session"); const uploadId = params.get("upload");
  const [file, setFile] = useState<File | null>(null); const [upload, setUpload] = useState<PropertyUpload | null>(null);
  const [session, setSession] = useState<ImportSession | null>(null); const [history, setHistory] = useState<ImportSession[]>([]);
  const [busy, setBusy] = useState(""); const [error, setError] = useState(""); const [jobOffset, setJobOffset] = useState(0); const [errorOffset, setErrorOffset] = useState(0);
  useEffect(() => { let alive = true; importHistory(subscribers).then((h) => { if (alive) setHistory(h); }).catch((e) => { if (alive) setError(e.message); }); return () => { alive = false; }; }, [sessionId, subscribers]);
  useEffect(() => { if (!uploadId || sessionId) return; let alive = true; getUpload(uploadId).then((u) => { if (alive) setUpload(u); }).catch((e) => { if (alive) setError(e.message); }); return () => { alive = false; }; }, [uploadId, sessionId]);
  useEffect(() => {
    if (!sessionId) return;
    let alive = true; let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      let done = false;
      try { const result = await getImport(sessionId!, jobOffset, errorOffset); if (alive) { setSession(result); setError(""); done = terminal.has(result.status); } }
      catch (e) { if (alive) setError(e instanceof Error ? e.message : "Progress unavailable; retrying shortly"); }
      if (alive && !done) timer = setTimeout(() => void poll(), 2000);
    }
    void poll(); return () => { alive = false; clearTimeout(timer); };
  }, [sessionId, jobOffset, errorOffset]);
  async function act(label:string, action:()=>Promise<void>) { setBusy(label); setError(""); try { await action(); } catch(e) { setError(e instanceof Error ? e.message : "Request failed"); if (uploadId) { try { setUpload(await getUpload(uploadId)); } catch { /* original error remains */ } } } finally { setBusy(""); } }
  const report = upload?.validation;
  const current = session?.id === sessionId ? session : null;
  return <div className="p-5 md:p-8 max-w-7xl space-y-6 text-navy">
    <Link to={subscribers ? "/admin/subscribers" : "/admin/properties"} className="text-sm underline">← Back to management</Link>
    <div><h1 className="font-display font-bold text-3xl">{subscribers ? "Import Subscribers" : "Bulk Import Properties"}</h1><p className="text-sm text-stone mt-2">Upload a CSV, validate every record, then review and confirm. Existing records are kept.</p></div>
    {error && <div role="alert" className="bg-red-50 text-red-800 p-4 whitespace-pre-wrap">{error}</div>}
    {busy && <p role="status">{busy}…</p>}
    {!sessionId && <>
      {!uploadId && <section className="bg-white border border-[#ddd5c5] p-6 space-y-4">
        <h2 className="font-semibold text-lg">1. Choose and upload</h2><p className="text-sm text-stone">Upload a UTF-8 CSV using the {subscribers ? "Name,Email,Phone subscriber" : "Sample.csv property"} format, up to 10 MB. Selecting a file does not upload or import it.</p>
        <label className="block text-sm">{subscribers ? "Subscriber CSV" : "Property CSV"}<input className="block mt-2" type="file" accept=".csv,text/csv" disabled={!!busy} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(""); }} /></label>
        <a className="inline-block text-sm underline" href={subscribers ? "/subscriber-sample.csv" : "/property-sample.csv"} download>{subscribers ? "Download subscriber sample CSV" : "Download property sample CSV"}</a>
        {file && <p>{file.name} · {(file.size / 1024).toFixed(1)} KB</p>}
        <button className={button + " bg-navy text-white"} disabled={!file || !!busy} onClick={() => void act("Uploading", async () => { if (!file || !/\.csv$/i.test(file.name) || file.size === 0 || file.size > 10*1024*1024) throw new Error("Choose a non-empty .csv file no larger than 10 MB"); const u = await uploadCsv(file, subscribers); setUpload(u); setParams({upload:u.id}); })}>Upload File</button>
      </section>}
      {uploadId && !upload && <p>Loading upload…</p>}
      {upload && upload.id === uploadId && <section className="bg-white border border-[#ddd5c5] p-6 space-y-4">
        <h2 className="font-semibold text-lg">2. Validate and review</h2><p className="font-medium">{upload.filename}</p><p className="text-sm">Status: {upload.status} · Expires {new Date(upload.expiresAt).toLocaleString()}</p>
        {upload.status === "UPLOADED" && <button className={button} disabled={!!busy} onClick={() => void act("Validating all rows", async () => { setUpload(await validateCsv(upload.id, subscribers)); })}>Validate File</button>}
        {report && <><div className="grid sm:grid-cols-3 gap-4">{[["Total rows",report.totalRows],["Valid rows",report.validRows],["Invalid rows",report.invalidRows]].map(([k,v]) => <div key={k} className="bg-cream p-4"><p className="text-xs text-stone">{k}</p><p className="text-2xl font-semibold">{v}</p></div>)}</div>
          <p className="text-sm break-words">Detected columns: {report.schema.receivedColumns.join(", ") || "None"}</p>
          {!report.schema.valid && <div className="bg-red-50 p-4 space-y-2 text-sm"><p>Required: {report.schema.requiredColumns.join(", ")}</p>{[["Missing",report.schema.missingColumns],["Unknown",report.schema.unknownColumns],["Duplicate",report.schema.duplicateColumns],["Empty column positions",report.schema.emptyColumns]].map(([k,v]) => (v as unknown[]).length > 0 && <p key={String(k)}>{String(k)}: {(v as unknown[]).join(", ")}</p>)}<p>Supported columns: {report.schema.expectedColumns.join(", ")}</p></div>}
          {report.errors.length > 0 && <Errors errors={report.errors} />}
          {report.errorsTruncated && <p className="text-sm">Showing the first {report.errors.length} of {report.totalErrors} issues. Every row was checked.</p>}
          {!report.valid && <p className="text-red-700">Correct the issues in your CSV, cancel this upload and upload the corrected file. Import is disabled.</p>}
          {report.valid && upload.status === "READY" && <div className="bg-green-50 p-5 space-y-3"><h3 className="font-semibold">Ready to import</h3><p className="text-sm">All {report.totalRows} records passed validation. Clicking Start Import confirms creation of these records. {subscribers ? "Only subscribers with explicit marketing consent can be imported." : "Missing publicationStatus defaults to DRAFT; PUBLISHED records appear publicly."}</p><button className={button + " bg-navy text-white"} disabled={!!busy} onClick={() => void act("Starting import", async () => { const s = await startCsv(upload.id, subscribers); setSession(s); setJobOffset(0); setErrorOffset(0); setParams({session:s.id}); })}>Start Import</button></div>}
        </>}
        {["UPLOADED","READY","INVALID"].includes(upload.status) && <button disabled={!!busy} className={button} onClick={() => void act("Cancelling upload", async () => { await cancelCsv(upload.id); setUpload(null); setFile(null); setParams({}); })}>Cancel upload</button>}
        {upload.status === "CANCELLED" && <button className={button} onClick={() => { setUpload(null); setParams({}); }}>Choose another CSV</button>}
      </section>}
      {subscribers ? <p className="bg-white p-5 text-sm">Required columns: Name, Email. Optional: Phone. Imported rows are recorded with marketing consent. Existing email addresses are updated rather than duplicated.</p> : <details className="bg-white p-5 text-sm"><summary className="cursor-pointer font-semibold">Required property CSV columns</summary><p className="mt-3 break-words">{propertyCsvColumns.join(", ")}</p><p className="mt-2">Years and Historical Prices must be quoted JSON arrays with matching, ascending entries. Each year is paired with the price at the same index. The first year must match Completion Year, and the latest historical price may differ from Price by at most 0.05 for rounding.</p></details>}
    </>}
    {sessionId && !current && <p>Loading import progress…</p>}
    {current && <section className="bg-white border border-[#ddd5c5] p-6 space-y-5">
      <div><h2 className="text-xl font-semibold">{current.filename}</h2><p className="text-sm break-all">Import {current.id} · {current.status.replaceAll("_"," ")}</p><p className="text-xs text-stone">By {current.adminName} · {new Date(current.createdAt).toLocaleString()}{current.completedAt && ` · Finished ${new Date(current.completedAt).toLocaleString()}`}</p></div>
      {current.queueWarning && <p role="status" className="bg-amber/15 p-3">{current.queueWarning}</p>}
      {current.errorSummary && <p className="text-red-700">{current.errorSummary}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[["Records",current.totalRows],["Batches",current.totalJobs],["Waiting",current.waitingJobs],["Processing",current.activeJobs],["Retrying",current.retryingJobs],["Completed batches",current.completedJobs],["Failed batches",current.failedJobs],["Imported records",current.successfulRows],["Failed records",current.failedRows]].map(([k,v]) => <div className="bg-cream p-3" key={k}><p className="text-xs text-stone">{k}</p><p className="text-xl font-semibold">{v}</p></div>)}</div>
      <label className="block text-sm">Processed: {current.percentage}%<progress className="w-full h-3 accent-amber" max={100} value={current.percentage}/></label><p className="text-xs text-stone">Imported counts include committed batches only. An in-progress batch is committed together or rolled back together.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{["Batch","Status","Records processed","Attempts","Error"].map((h) => <th className="p-2 border-b" key={h}>{h}</th>)}</tr></thead><tbody>{current.chunks.map((c) => <tr key={c.id}><td className="p-2">{c.chunkIndex+1}</td><td>{c.status}</td><td>{c.processedRows} / {c.totalRows}</td><td>{c.attempts}</td><td className="max-w-sm">{c.lastError}</td></tr>)}</tbody></table></div>
      <Pager offset={jobOffset} size={50} total={current.totalJobs} change={setJobOffset}/>
      {current.errorCount > 0 && <><h3 className="font-semibold">Record errors ({current.errorCount})</h3><Errors errors={current.rowErrors}/><Pager offset={errorOffset} size={100} total={current.errorCount} change={setErrorOffset}/></>}
      {terminal.has(current.status) && <div className="flex gap-3"><Link className={button} to={subscribers ? "/admin/subscribers" : "/admin/properties"}>View records</Link><button className={button} onClick={() => { setUpload(null); setSession(null); setFile(null); setParams({}); }}>New upload</button></div>}
    </section>}
    {history.length > 0 && <section className="space-y-3"><h2 className="font-semibold text-lg">Recent imports</h2><div className="bg-white divide-y">{history.map((h) => <button key={h.id} className="p-4 text-left w-full hover:bg-cream-dark flex flex-wrap justify-between gap-2" onClick={() => { setJobOffset(0); setErrorOffset(0); setParams({session:h.id}); }}><span>{h.filename} · {new Date(h.createdAt).toLocaleString()}</span><span className="text-sm">{h.status} · {h.successfulRows}/{h.totalRows} imported</span></button>)}</div></section>}
  </div>;
}
function Errors({errors}:{errors:ImportError[]}) { return <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr>{["Row","Field","Value","Error","Type"].map((h) => <th className="p-2 border-b" key={h}>{h}</th>)}</tr></thead><tbody>{errors.map((e,i) => <tr key={i} className="border-b"><td className="p-2">{e.rowNumber || "File"}</td><td className="p-2">{e.field}</td><td className="p-2 max-w-48 break-all">{e.value}</td><td className="p-2">{e.message}</td><td className="p-2">{e.errorType}</td></tr>)}</tbody></table></div>; }
function Pager({offset,size,total,change}:{offset:number;size:number;total:number;change:(n:number)=>void}) { return total > size && <div className="flex items-center gap-3 text-sm"><button className={button} disabled={!offset} onClick={() => change(offset-size)}>Previous</button><span>{offset+1}–{Math.min(offset+size,total)} of {total}</span><button className={button} disabled={offset+size>=total} onClick={() => change(offset+size)}>Next</button></div>; }

