import { useApp } from "../context";

type AdminView =
  | "admin-dashboard" | "admin-properties" | "admin-property-form"
  | "admin-campaigns" | "admin-campaign-create" | "admin-subscribers"
  | "admin-interests" | "admin-news";

const items: { icon: string; label: string; view: AdminView }[] = [
  { icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", label: "Dashboard", view: "admin-dashboard" },
  { icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", label: "Properties", view: "admin-properties" },
  { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", label: "Campaigns", view: "admin-campaigns" },
  { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", label: "Subscribers", view: "admin-subscribers" },
  { icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", label: "Interests", view: "admin-interests" },
  { icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z", label: "News", view: "admin-news" },
];

export default function AdminSidebar() {
  const { view, nav, logout } = useApp();

  return (
    <aside className="w-56 shrink-0 bg-navy min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <button onClick={() => nav("admin-dashboard")} className="flex items-center gap-2 text-white font-display font-bold text-lg">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <polygon points="14,2 26,24 2,24" fill="none" stroke="#E8761B" strokeWidth="2"/>
            <polygon points="14,8 22,22 6,22" fill="#E8761B" opacity="0.3"/>
          </svg>
          Harborstone
        </button>
        <div className="mt-1 text-amber text-[10px] font-semibold uppercase tracking-widest ml-8">Admin CMS</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {items.map(({ icon, label, view: v }) => {
          const active = view === v || (v === "admin-properties" && view === "admin-property-form");
          return (
            <button
              key={label}
              onClick={() => nav(v)}
              className={`admin-sidebar-item w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-sm transition-all ${
                active
                  ? "bg-amber text-white"
                  : "text-white/65 hover:text-white hover:bg-white/8"
              }`}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={icon}/>
              </svg>
              {label}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-5 space-y-1 border-t border-white/10 pt-4">
        <button
          onClick={() => nav("home")}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/8 transition-all"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Public Site
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/8 transition-all"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
