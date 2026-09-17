import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { appUsers, interests as initialInterests, subscribers as initialSubscribers, campaigns as initialCampaigns, newsArticles as initialNews, properties as initialProperties } from "./data";
import type { Property, Interest, Subscriber, Campaign, NewsArticle } from "./data";

type View =
  | "home" | "properties" | "property-detail" | "mortgage" | "compare"
  | "saved" | "analytics" | "news" | "chatbot"
  | "admin-dashboard" | "admin-properties" | "admin-property-form"
  | "admin-campaigns" | "admin-campaign-create" | "admin-subscribers"
  | "admin-interests" | "admin-news";

interface AppUser { id: string; name: string; email: string; role: "user" | "admin" }

interface AppCtx {
  view: View;
  nav: (v: View, params?: Record<string, string>) => void;
  params: Record<string, string>;
  user: AppUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  savedIds: string[];
  toggleSave: (id: string) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
  properties: Property[];
  setProperties: (p: Property[]) => void;
  interests: Interest[];
  setInterests: (i: Interest[]) => void;
  subscribers: Subscriber[];
  setSubscribers: (s: Subscriber[]) => void;
  campaigns: Campaign[];
  setCampaigns: (c: Campaign[]) => void;
  news: NewsArticle[];
  setNews: (n: NewsArticle[]) => void;
  showLogin: boolean;
  setShowLogin: (v: boolean) => void;
}

const Ctx = createContext<AppCtx>(null!);

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("home");
  const [params, setParams] = useState<Record<string, string>>({});
  const [user, setUser] = useState<AppUser | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [interests, setInterests] = useState<Interest[]>(initialInterests);
  const [subscribers, setSubscribers] = useState<Subscriber[]>(initialSubscribers);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [news, setNews] = useState<NewsArticle[]>(initialNews);
  const [showLogin, setShowLogin] = useState(false);

  const nav = (v: View, p?: Record<string, string>) => {
    setView(v);
    setParams(p ?? {});
    window.scrollTo(0, 0);
  };

  const login = (email: string, password: string) => {
    const u = appUsers.find((x) => x.email === email && x.password === password);
    if (u) { setUser({ id: u.id, name: u.name, email: u.email, role: u.role }); return true; }
    return false;
  };

  const logout = () => {
  setUser(null);
  };

  const toggleSave = (id: string) =>
    setSavedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleCompare = (id: string) =>
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );

  return (
    <Ctx.Provider value={{ view, nav, params, user, login, logout, savedIds, toggleSave, compareIds, toggleCompare, properties, setProperties, interests, setInterests, subscribers, setSubscribers, campaigns, setCampaigns, news, setNews, showLogin, setShowLogin }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
