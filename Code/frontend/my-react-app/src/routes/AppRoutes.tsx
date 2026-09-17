import Login from "../views/Login";
import { Routes, Route } from "react-router-dom";

import PublicLayout from "./PublicLayout";
import AdminLayout from "./AdminLayout";
import RequireAdmin from "./RequireAdmin";

import Home from "../views/Home";
import PropertiesList from "../views/PropertiesList";
import PropertyDetail from "../views/PropertyDetail";
import MortgageCalc from "../views/MortgageCalc";
import Compare from "../views/Compare";
import SavedProperties from "../views/SavedProperties";
import Analytics from "../views/Analytics";
import News from "../views/News";
import Chatbot from "../views/Chatbot";

import AdminDashboard from "../views/admin/Dashboard";
import AdminProperties from "../views/admin/Properties";
import AdminPropertyForm from "../views/admin/PropertyForm";
import PropertyImport from "../views/admin/PropertyImport";
import Users from "../views/admin/Users";
import Templates from "../views/admin/Templates";
import AdminCampaigns from "../views/admin/Campaigns";
import AdminSubscribers from "../views/admin/Subscribers";
import AdminInterests from "../views/admin/Interests";
import AdminNewsManager from "../views/admin/NewsManager";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/properties" element={<PropertiesList />} />
        <Route path="/properties/:id" element={<PropertyDetail />} />
        <Route path="/mortgage" element={<MortgageCalc />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/saved" element={<SavedProperties />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:id" element={<News />} />
        <Route path="/chatbot" element={<Chatbot />} />
      </Route>

      <Route
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/properties" element={<AdminProperties />} />
        <Route path="/admin/properties/new" element={<AdminPropertyForm />} />
        <Route path="/admin/properties/import" element={<PropertyImport />} />
        <Route path="/admin/properties/:id/edit" element={<AdminPropertyForm />} />
        <Route path="/admin/campaigns" element={<AdminCampaigns />} />
        <Route path="/admin/subscribers" element={<AdminSubscribers />} />
        <Route path="/admin/subscribers/import" element={<PropertyImport key="subscribers" subscribers />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/templates" element={<Templates />} />
        <Route path="/admin/interests" element={<AdminInterests />} />
        <Route path="/admin/news" element={<AdminNewsManager />} />
      </Route>
    </Routes>
  );
}
