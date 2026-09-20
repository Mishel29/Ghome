import { comparisonSelection } from "./lib/calculations";
import { captureCampaignAttributionFromUrl, getCampaignAttributionToken } from "./lib/campaignAttribution";
import { getAuthToken, setAuthToken, graphqlRequest } from "./api/graphql";
import { propertyPage, viewProperty, propertyById, PROPERTY_FIELDS } from "./api/properties";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { Property as ApiProperty, NewsConnection } from "./api/schemaTypes";
import type { Property, NewsArticle } from "./data";

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
  login: (email: string, password: string) => Promise<AppUser>;
  authLoading: boolean;
  refreshProperties: () => Promise<void>;
  logout: () => void;
  savedIds: string[];
  toggleSave: (id: string) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
  properties: Property[];
  setProperties: (p: Property[]) => void;
  news: NewsArticle[];
  setNews: (n: NewsArticle[]) => void;
  showLogin: boolean;
  setShowLogin: (v: boolean) => void;
}

const Ctx = createContext<AppCtx>(null!);
const SAVED_PROPERTIES_KEY = "harborstone-saved-properties";

function readLocalSavedIds(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(SAVED_PROPERTIES_KEY) ?? "[]");
    return Array.isArray(value) && value.every((id): id is string => typeof id === "string") ? value : [];
  } catch {
    return [];
  }
}

function writeLocalSavedIds(ids: string[]) {
  localStorage.setItem(SAVED_PROPERTIES_KEY, JSON.stringify(ids));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("home");
  const [params, setParams] = useState<Record<string, string>>({});
  const [user, setUser] = useState<AppUser | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>(readLocalSavedIds);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const expired = () => { setUser(null); setSavedIds(readLocalSavedIds()); setShowLogin(true); };
    window.addEventListener("auth-expired", expired);
    return () => window.removeEventListener("auth-expired", expired);
  }, []);

  const nav = (v: View, p?: Record<string, string>) => {
    setView(v);
    setParams(p ?? {});
    window.scrollTo(0, 0);
  };

  const refreshProperties = useCallback(async () => {
    const page = await propertyPage(false, {}, 0, 100);
    setProperties(page.nodes.map(viewProperty));
  }, []);

  useEffect(() => {
    captureCampaignAttributionFromUrl();
    let active = true;
    const restore = async () => {
      try {
        if (getAuthToken()) {
          const { me } = await graphqlRequest<{ me: { id: string; name: string; email: string; role: string } }>("{me{id name email role}}");
          if (active) setUser({ ...me, role: me.role === "ADMIN" ? "admin" : "user" });
        }
      } catch { setAuthToken(null); }
      finally { if (active) setAuthLoading(false); }
    };
    void restore();
    void propertyPage(false, {}, 0, 100).then((page) => { if (active) setProperties(page.nodes.map(viewProperty)); }).catch(() => {});
    return () => { active = false; };
  }, [refreshProperties]);

  const login = async (email: string, password: string) => {
    const { login: result } = await graphqlRequest<{ login: { token: string; user: { id: string; name: string; email: string; role: string } } }>(
      "mutation($email:String!,$password:String!){login(email:$email,password:$password){token user{id name email role}}}", { email, password });
    const account: AppUser = { ...result.user, role: result.user.role === "ADMIN" ? "admin" : "user" };
    setAuthToken(result.token);
    setUser(account);
    return account;
  };

  const logout = () => {
    void graphqlRequest("mutation{logout}").catch(() => {});
    setAuthToken(null);
    setUser(null);
    setSavedIds(readLocalSavedIds());
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    graphqlRequest<{savedProperties: ApiProperty[]}>(`{savedProperties{${PROPERTY_FIELDS}}}`).then(({ savedProperties }) => {
      if (active) {
        setSavedIds(savedProperties.map((p) => p.id));
        setProperties((current) => [...new Map([...current, ...savedProperties.map(viewProperty)].map((p) => [p.id, p])).values()]);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    let active = true;
    graphqlRequest<{publicNewsPage: NewsConnection}>('{publicNewsPage(input:{limit:20}){totalCount nodes{id title summary content imageUrl publishedAt activeFrom publicationStatus properties{id name}}}}').then(({ publicNewsPage }) => {
      if (active) setNews(publicNewsPage.nodes.map((n) => ({ id:n.id, title:n.title, summary:n.summary ?? "", content:n.content ?? "", image:n.imageUrl ?? "", publishDate:n.publishedAt ?? "", activeDate:n.activeFrom ?? "", published:true, relatedProperties:n.properties.map((p) => p.id) })));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const cacheProperty = async (id: string) => {
    const property = await propertyById(id);
    if (property) setProperties((old) => [...old.filter((p) => p.id !== id), viewProperty(property)]);
  };

  const toggleSave = (id: string) => {
    const saved = !savedIds.includes(id);
    captureCampaignAttributionFromUrl();
    const campaignToken = getCampaignAttributionToken();
    if (!user) {
      const next = saved ? [...new Set([...savedIds, id])] : savedIds.filter((savedId) => savedId !== id);
      setSavedIds(next);
      writeLocalSavedIds(next);
      if (saved && campaignToken) void graphqlRequest("mutation($id:ID!,$campaignToken:String!){recordCampaignSave(propertyId:$id,campaignToken:$campaignToken)}", { id, campaignToken }).catch(() => {});
      void cacheProperty(id).catch(() => {});
      return;
    }
    void graphqlRequest('mutation($id:ID!,$saved:Boolean!,$campaignToken:String){setPropertySaved(propertyId:$id,saved:$saved,campaignToken:$campaignToken)}', { id, saved, campaignToken }).then(async () => {
      setSavedIds((old) => saved ? [...new Set([...old, id])] : old.filter((x) => x !== id));
      await cacheProperty(id);
    }).catch((error) => window.alert(error.message));
  };

  const toggleCompare = (id: string) => {
    setCompareIds((old) => comparisonSelection(old, id));
    void cacheProperty(id).catch(() => {});
  };

  return <Ctx.Provider value={{ authLoading, refreshProperties, view, nav, params, user, login, logout, savedIds, toggleSave, compareIds, toggleCompare, properties, setProperties, news, setNews, showLogin, setShowLogin }}>
    {children}
  </Ctx.Provider>;
}

// The context hook is intentionally exported beside its provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(Ctx);
