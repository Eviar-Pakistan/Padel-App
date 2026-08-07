import { Navigate } from "react-router-dom";

export default function OwnerProtectedRoute({ children }) {
  const token = localStorage.getItem("ownerAccessToken");
  if (!token) {
    return <Navigate to="/owner/login" replace />;
  }
  return children;
}
