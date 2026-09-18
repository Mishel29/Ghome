import { useApp } from "../context";
import { Link } from "react-router-dom";

interface RequireAdminProps {
  children: React.ReactNode;
}

export default function RequireAdmin({
  children,
}: RequireAdminProps) {
  const { user, authLoading, setShowLogin } = useApp();

  if (authLoading) return <div className="p-8">Checking your session…</div>;
  if (!user || user.role !== "admin") return <div className="min-h-screen bg-cream p-10 text-center"><h1 className="text-2xl font-bold mb-4">Admin sign in required</h1><div className="flex justify-center gap-3"><button className="bg-navy text-white px-6 py-3" onClick={() => setShowLogin(true)}>Sign in</button><Link className="border border-navy px-6 py-3 text-navy" to="/">Public Site</Link></div></div>;

  return <>{children}</>;
}