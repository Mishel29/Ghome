import { Navigate } from "react-router-dom";
import { useApp } from "../context";

interface RequireAdminProps {
  children: React.ReactNode;
}

export default function RequireAdmin({
  children,
}: RequireAdminProps) {
  const { user } = useApp();

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}