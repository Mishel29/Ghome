import { useState } from "react";
import { useApp } from "../context";
import PropertyCard from "../components/PropertyCard";

export default function Home() {
  const { properties, news, nav } = useApp();
  const [search, setSearch] = useState("");

  const featured = properties.filter((p) => p.status === "on-sale" || p.status === "coming-soon").slice(0, 8);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    nav("properties");
  };

  return (
    <div className="bg-cream min-h-screen">
      {/* Hero */}
      <section className="relative h-[88vh] min-h-[520px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=1080&fit=crop&auto=format"
          alt="Harborstone Homes aerial view"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60"/>
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6 gap-6">
          <div className="script-hero">Find Your Perfect Home</div>
          <p className="text-white/90 text-lg max-w-xl font-light tracking-wide">
            New homes across Ireland's finest communities — built to last, designed to inspire.
          </p>
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex w-full max-w-lg mt-2 shadow-xl">
            <input
              className="flex-1 px-5 py-3.5 bg-white text-navy placeholder-stone text-sm font-medium focus:outline-none"
              placeholder="Search by location, county or development..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="submit"
              className="bg-amber hover:bg-amber-hover text-white px-6 font-semibold text-sm transition-colors"
            >
              Search
            </button>
          </form>
          <button
            onClick={() => nav("properties")}
            className="border border-white text-white px-10 py-3 text-sm font-semibold hover:bg-white hover:text-navy transition-all tracking-wider uppercase"
          >
            Find Your New Home
          </button>
        </div>
      </section>

      {/* Quick action strip */}
      <section className="bg-navy">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
          {[
            { icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M9 17h6", label: "Mortgage Calculator", action: () => nav("mortgage") },
            { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Compare Properties", action: () => nav("compare") },
            { icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", label: "Property Analytics", action: () => nav("analytics") },
            { icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", label: "AI Home Assistant", action: () => nav("chatbot") },
          ].map(({ icon, label, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex flex-col items-center gap-2 py-5 px-4 border-r border-white/10 last:border-r-0 text-white/70 hover:text-white hover:bg-white/8 transition-all group"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={icon}/>
              </svg>
              <span className="text-xs font-medium text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Communities */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-burgundy font-display text-3xl font-bold">Featured Communities</h2>
            <p className="text-stone text-sm mt-1">Discover our latest developments across Ireland</p>
          </div>
          <button
            onClick={() => nav("properties")}
            className="text-sm font-semibold text-navy hover:text-amber flex items-center gap-1 transition-colors"
          >
            View all
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featured.map((p) => (
            <PropertyCard key={p.id} property={p} showCompare />
          ))}
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-cream-dark border-y border-[#ddd5c5]">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "2,400+", label: "Homes Built" },
            { value: "12", label: "Active Communities" },
            { value: "97%", label: "Customer Satisfaction" },
            { value: "30+", label: "Years Experience" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="font-display text-3xl font-bold text-navy">{value}</div>
              <div className="text-stone text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Latest News */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-burgundy font-display text-3xl font-bold">Latest News</h2>
          <button onClick={() => nav("news")} className="text-sm font-semibold text-navy hover:text-amber flex items-center gap-1 transition-colors">
            All news
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {news.filter((n) => n.published).slice(0, 3).map((article) => (
            <article key={article.id} className="bg-cream-dark group cursor-pointer" onClick={() => nav("news")}>
              <div className="aspect-[16/9] overflow-hidden">
                <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
              </div>
              <div className="p-5">
                <div className="text-[11px] text-stone mb-2 uppercase tracking-wider">
                  {new Date(article.publishDate).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" })}
                </div>
                <h3 className="font-display font-semibold text-navy text-base leading-snug mb-2 group-hover:text-burgundy transition-colors">
                  {article.title}
                </h3>
                <p className="text-stone text-sm leading-relaxed line-clamp-2">{article.summary}</p>
                <div className="mt-3 text-xs font-semibold text-amber flex items-center gap-1">
                  Read more
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white/60 text-xs">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="font-display text-white font-bold text-lg mb-3">Harborstone Homes</div>
            <p className="leading-relaxed">Building quality homes across Ireland since 1994. Registered in Ireland No. 123456.</p>
          </div>
          {[
            { title: "Find a Home", links: ["Search Properties", "New Homes", "Apartments", "First-Time Buyers"] },
            { title: "Company", links: ["About Us", "Careers", "Corporate Site", "Land Acquisition"] },
            { title: "Support", links: ["Contact Us", "FAQs", "Privacy Policy", "Cookie Policy"] },
          ].map(({ title, links }) => (
            <div key={title}>
              <div className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">{title}</div>
              <ul className="space-y-2">
                {links.map((l) => <li key={l}><button className="hover:text-white transition-colors">{l}</button></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span>© 2025 Harborstone Homes. All rights reserved.</span>
          <span>Regulated by the Property Services Regulatory Authority</span>
        </div>
      </footer>
    </div>
  );
}
