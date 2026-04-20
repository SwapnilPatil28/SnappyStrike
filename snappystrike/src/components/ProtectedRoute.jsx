import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If roles are specified and user role doesn't match
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" />; // Redirect unprivileged
  }

  return children;
}
