import { Navigate } from "react-router-dom";

export default function RefereeProtectedRoute({ children }) {
  const token = localStorage.getItem("refereeAccessToken");
  if (!token) {
    return <Navigate to="/referee/login" replace />;
  }
  return children;
}
