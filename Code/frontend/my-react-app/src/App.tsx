import { AppProvider, useApp } from "./context";
import PublicNav from "./components/PublicNav";
import AdminSidebar from "./components/AdminSidebar";
import Home from "./views/Home";
import PropertiesList from "./views/PropertiesList";
import PropertyDetail from "./views/PropertyDetail";
import MortgageCalc from "./views/MortgageCalc";
import Compare from "./views/Compare";
import SavedProperties from "./views/SavedProperties";
import Analytics from "./views/Analytics";
import News from "./views/News";
import Chatbot from "./views/Chatbot";
import LoginModal from "./views/Login";
import AdminDashboard from "./views/admin/Dashboard";
import AdminProperties from "./views/admin/Properties";
import AdminPropertyForm from "./views/admin/PropertyForm";
import AdminCampaigns from "./views/admin/Campaigns";
import AdminSubscribers from "./views/admin/Subscribers";
import AdminInterests from "./views/admin/Interests";
import AdminNewsManager from "./views/admin/NewsManager";

const ADMIN_VIEWS = [
  "admin-dashboard", "admin-properties", "admin-property-form",
  "admin-campaigns", "admin-campaign-create", "admin-subscribers",
  "admin-interests", "admin-news",
];

function Router() {
  const { view, user, nav, showLogin } = useApp();
  const isAdmin = ADMIN_VIEWS.includes(view);

  // Redirect non-admin users away from admin
  if (isAdmin && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="font-display text-navy text-2xl font-bold mb-2">Access Restricted</h2>
          <p className="text-stone mb-4">Admin login required to view this page.</p>
          <button onClick={() => nav("home")} className="bg-navy text-white px-6 py-2.5 text-sm font-semibold hover:bg-amber transition-colors">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="flex min-h-screen bg-cream">
        <AdminSidebar/>
        <main className="flex-1 overflow-auto bg-cream min-h-screen">
          {view === "admin-dashboard" && <AdminDashboard/>}
          {(view === "admin-properties") && <AdminProperties/>}
          {view === "admin-property-form" && <AdminPropertyForm/>}
          {(view === "admin-campaigns" || view === "admin-campaign-create") && <AdminCampaigns/>}
          {view === "admin-subscribers" && <AdminSubscribers/>}
          {view === "admin-interests" && <AdminInterests/>}
          {view === "admin-news" && <AdminNewsManager/>}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <PublicNav/>
      {view === "home" && <Home/>}
      {view === "properties" && <PropertiesList/>}
      {view === "property-detail" && <PropertyDetail/>}
      {view === "mortgage" && <MortgageCalc/>}
      {view === "compare" && <Compare/>}
      {view === "saved" && <SavedProperties/>}
      {view === "analytics" && <Analytics/>}
      {view === "news" && <News/>}
      {view === "chatbot" && <Chatbot/>}
      {showLogin && <LoginModal/>}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router/>
    </AppProvider>
  );
}
