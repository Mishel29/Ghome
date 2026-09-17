import { Outlet } from "react-router-dom";
import PublicNav from "../components/PublicNav";

export default function PublicLayout() {
  

  return (
    <div className="min-h-screen bg-cream">
      <PublicNav />

      <main>
        <Outlet />
      </main>

      
    </div>
  );
}