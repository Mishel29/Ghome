import { useState } from "react";
import { useApp } from "../../context";
import type { NewsArticle } from "../../data";

const BLANK: Omit<NewsArticle, "id"> = {
  title: "", summary: "", content: "", publishDate: new Date().toISOString().split("T")[0],
  activeDate: new Date().toISOString().split("T")[0], image: "", relatedProperties: [], published: false,
};

export default function AdminNewsManager() {
  const { news, setNews, properties } = useApp();
  const [editing, setEditing] = useState<NewsArticle | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<typeof BLANK>({ ...BLANK });
  const [saved, setSaved] = useState(false);

  const openCreate = () => { setForm({ ...BLANK }); setEditing(null); setCreating(true); };
  const openEdit = (a: NewsArticle) => { setForm({ ...a }); setEditing(a); setCreating(true); };

  const save = (publish = false) => {
    if (!form.title.trim()) return;
    const updated = { ...form, published: publish };
    if (editing) {
      setNews(news.map((n) => n.id === editing.id ? { ...n, ...updated } : n));
    } else {
      setNews([...news, { id: `news-${Date.now()}`, ...updated }]);
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); setCreating(false); setEditing(null); }, 1200);
  };

  const deleteArticle = (id: string) => setNews(news.filter((n) => n.id !== id));
  const togglePublish = (id: string) => setNews(news.map((n) => n.id === id ? { ...n, published: !n.published } : n));

  const toggleRelatedProp = (id: string) =>
    setForm((prev) => ({
      ...prev,
      relatedProperties: prev.relatedProperties.includes(id)
        ? prev.relatedProperties.filter((x) => x !== id)
        : [...prev.relatedProperties, id],
    }));

  const inputCls = "w-full border border-[#ddd5c5] px-3 py-2.5 text-sm text-navy bg-white";

  if (creating) return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setCreating(false)} className="text-stone hover:text-navy transition-colors">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="font-display text-navy text-3xl font-bold">{editing ? "Edit Article" : "Add News Article"}</h1>
      </div>

      {saved && (
        <div className="bg-sage/20 border border-sage text-sage px-4 py-3 text-sm font-semibold mb-5 flex items-center gap-2">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
          Saved!
        </div>
      )}

      <div className="bg-white shadow-sm p-7 space-y-5">
        <div>
          <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1.5">Headline *</label>
          <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Article headline..."/>
        </div>

        <div>
          <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1.5">Summary</label>
          <textarea className={`${inputCls} h-20 resize-none`} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Short summary for preview..."/>
        </div>

        <div>
          <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1.5">Full Content</label>
          <textarea className={`${inputCls} h-40 resize-none`} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Full article content..."/>
        </div>

        <div>
          <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1.5">Cover Image URL</label>
          <input className={inputCls} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://images.unsplash.com/..."/>
          {form.image && <img src={form.image} alt="Preview" className="mt-2 h-32 object-cover border border-[#ddd5c5]"/>}
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1.5">Publish Date</label>
            <input type="date" className={inputCls} value={form.publishDate} onChange={(e) => setForm({ ...form, publishDate: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1.5">Go-Live Date</label>
            <input type="date" className={inputCls} value={form.activeDate} onChange={(e) => setForm({ ...form, activeDate: e.target.value })}/>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-2">Related Properties</label>
          <div className="flex flex-wrap gap-2">
            {properties.map((p) => {
              const isOn = form.relatedProperties.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleRelatedProp(p.id)}
                  className={`text-xs px-3 py-1.5 border transition-all ${isOn ? "border-amber bg-amber/10 text-navy font-medium" : "border-[#ddd5c5] text-stone hover:border-navy hover:text-navy"}`}
                >
                  {isOn && "✓ "}{p.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-[#EDE5D5]">
          <button onClick={() => save(false)} className="bg-cream-dark border border-[#ddd5c5] text-navy px-6 py-2.5 text-sm font-semibold hover:bg-cream transition-colors">
            Save as Draft
          </button>
          <button onClick={() => save(true)} className="bg-amber text-white px-6 py-2.5 text-sm font-semibold hover:bg-amber-hover transition-colors">
            Publish
          </button>
          <button onClick={() => setCreating(false)} className="ml-auto text-stone hover:text-navy text-sm transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-navy text-3xl font-bold">News Management</h1>
          <p className="text-stone text-sm mt-1">{news.filter((n) => n.published).length} published · {news.filter((n) => !n.published).length} drafts</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-amber text-white px-5 py-2.5 text-sm font-semibold hover:bg-amber-hover transition-colors flex items-center gap-2"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Add Article
        </button>
      </div>

      <div className="space-y-4">
        {news.map((article) => {
          const relProps = properties.filter((p) => article.relatedProperties.includes(p.id));
          return (
            <div key={article.id} className="bg-white shadow-sm flex gap-0 overflow-hidden">
              {article.image && (
                <img src={article.image} alt={article.title} className="w-48 h-full object-cover shrink-0 hidden md:block"/>
              )}
              <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-display text-navy font-semibold text-base leading-snug">{article.title}</h3>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 shrink-0 ${article.published ? "bg-sage/15 text-sage" : "bg-blue-50 text-blue-600"}`}>
                      {article.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="text-stone text-sm line-clamp-2 mb-2">{article.summary}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-stone">
                    <span>Published: {article.publishDate}</span>
                    <span>Go-live: {article.activeDate}</span>
                    {relProps.length > 0 && <span>Properties: {relProps.map((p) => p.name).join(", ")}</span>}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => openEdit(article)} className="text-xs border border-navy text-navy px-3 py-1.5 hover:bg-navy hover:text-white transition-all">Edit</button>
                  <button onClick={() => togglePublish(article.id)} className={`text-xs border px-3 py-1.5 transition-all ${article.published ? "border-stone text-stone hover:bg-stone hover:text-white" : "border-sage text-sage hover:bg-sage hover:text-white"}`}>
                    {article.published ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={() => deleteArticle(article.id)} className="text-xs border border-red-200 text-red-500 px-3 py-1.5 hover:bg-red-500 hover:text-white transition-all ml-auto">Delete</button>
                </div>
              </div>
            </div>
          );
        })}
        {news.length === 0 && (
          <div className="text-center py-20 text-stone">
            <p className="font-display text-xl text-navy mb-2">No articles yet</p>
            <button onClick={openCreate} className="text-amber hover:underline text-sm">Create your first article</button>
          </div>
        )}
      </div>
    </div>
  );
}
