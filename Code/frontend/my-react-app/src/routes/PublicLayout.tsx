import { Outlet } from "react-router-dom";
import PublicNav from "../components/PublicNav";
import LoginModal from "../views/Login";
import { useApp } from "../context";

export default function PublicLayout() {
  const { showLogin } = useApp();

  return (
    <div className="min-h-screen bg-cream">
      <PublicNav />

      <main>
        <Outlet />
      </main>

      {showLogin && <LoginModal />}
    </div>
  );
}