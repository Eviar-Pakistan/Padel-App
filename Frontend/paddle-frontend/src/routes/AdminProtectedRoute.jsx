import { Navigate } from "react-router-dom";

export default function AdminProtectedRoute({ children }) {
  const token = localStorage.getItem("adminAccessToken");

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
