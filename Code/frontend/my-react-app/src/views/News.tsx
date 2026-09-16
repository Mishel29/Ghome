import { useApp } from "../context";

export default function News() {
  const { news, properties, nav } = useApp();
  const published = news.filter((n) => n.published);

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-navy py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-display text-white text-3xl font-bold">Latest News</h1>
          <p className="text-white/60 text-sm mt-1">Updates from Harborstone Homes</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        {published.map((article, i) => {
          const relProps = properties.filter((p) => article.relatedProperties.includes(p.id));
          return (
            <article key={article.id} className={`grid gap-8 ${i === 0 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
              <div className={`overflow-hidden ${i === 0 ? "" : ""}`}>
                <img
                  src={article.image}
                  alt={article.title}
                  className={`w-full object-cover ${i === 0 ? "h-72" : "h-44"}`}
                />
              </div>
              <div className={i === 0 ? "flex flex-col justify-center" : "md:col-span-2 flex flex-col justify-center"}>
                <div className="text-[11px] text-stone uppercase tracking-widest mb-3">
                  {new Date(article.publishDate).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" })}
                </div>
                <h2 className={`font-display font-bold text-navy leading-tight mb-3 ${i === 0 ? "text-2xl" : "text-xl"}`}>
                  {article.title}
                </h2>
                <p className="text-stone leading-relaxed mb-4 text-sm">{article.summary}</p>
                <p className="text-navy/70 text-sm leading-relaxed mb-4">{article.content}</p>

                {relProps.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs text-stone">Related:</span>
                    {relProps.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => nav("property-detail", { id: p.id })}
                        className="text-xs bg-cream-dark border border-[#ddd5c5] text-navy px-2.5 py-1 hover:border-amber hover:text-amber transition-all"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {i !== published.length - 1 && <div className="col-span-full h-px bg-[#ddd5c5] mt-4"/>}
            </article>
          );
        })}

        {published.length === 0 && (
          <div className="text-center py-20 text-stone">
            <p className="font-display text-xl text-navy mb-2">No news published yet</p>
            <p className="text-sm">Check back soon for updates</p>
          </div>
        )}
      </div>
    </div>
  );
}
