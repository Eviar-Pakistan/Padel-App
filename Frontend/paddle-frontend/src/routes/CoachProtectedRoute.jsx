import { Navigate } from "react-router-dom";

export default function CoachProtectedRoute({ children }) {
  const token = localStorage.getItem("coachAccessToken");
  if (!token) {
    return <Navigate to="/coach/login" replace />;
  }
  return children;
}
