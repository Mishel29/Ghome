import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-cream">
      <AdminSidebar />

      <main className="flex-1 overflow-auto bg-cream">
        <Outlet />
      </main>
    </div>
  );
}