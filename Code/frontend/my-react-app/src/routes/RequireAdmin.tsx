import { useApp } from "../context";

interface RequireAdminProps {
  children: React.ReactNode;
}

export default function RequireAdmin({
  children,
}: RequireAdminProps) {
  const { user, authLoading, setShowLogin } = useApp();

  if (authLoading) return <div className="p-8">Checking your session…</div>;
  if (!user || user.role !== "admin") return <div className="p-10 text-center"><h1 className="text-2xl font-bold mb-4">Admin sign in required</h1><button className="bg-navy text-white px-6 py-3" onClick={() => setShowLogin(true)}>Sign in</button></div>;

  return <>{children}</>;
}