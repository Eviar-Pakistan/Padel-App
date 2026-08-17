import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "../context/CartContext";
import { NotificationsProvider } from "../context/NotificationsContext";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ProtectedRoute from "./ProtectedRoute";
import AdminProtectedRoute from "./AdminProtectedRoute";
import OwnerProtectedRoute from "./OwnerProtectedRoute";
import CoachProtectedRoute from "./CoachProtectedRoute";
import AdminLogin from "../pages/admin/AdminLogin";
import AdminDashboard from "../pages/admin/AdminDashboard";
import OwnerLogin from "../pages/owner/OwnerLogin";
import OwnerDashboard from "../pages/owner/OwnerDashboard";
import OwnerProductDetails from "../pages/owner/OwnerProductDetails";
import CoachLogin from "../pages/coach/CoachLogin";
import CoachDashboard from "../pages/coach/CoachDashboard";
import NewsFeed from "../pages/NewsFeed";
import Profile from "../pages/Profile";
import Shop from "../pages/Shop";
import ShopProductDetails from "../pages/ShopProductDetails";
import Cart from "../pages/Cart";
import CourtBooking from "../pages/CourtBooking";
import CourtDetails from "../pages/CourtDetails";
import MyBookings from "../pages/MyBookings";
import Notifications from "../pages/Notifications";
import Coaches from "../pages/Coaches";
import CoachDetails from "../pages/CoachDetails";
import Chat from "../pages/Chat";
import TopPlayers from "../pages/TopPlayers";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <CartProvider>
        <NotificationsProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/news"
              element={
                <ProtectedRoute>
                  <NewsFeed />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courts"
              element={
                <ProtectedRoute>
                  <CourtBooking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courts/:id"
              element={
                <ProtectedRoute>
                  <CourtDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop"
              element={
                <ProtectedRoute>
                  <Shop />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop/:id"
              element={
                <ProtectedRoute>
                  <ShopProductDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coaches"
              element={
                <ProtectedRoute>
                  <Coaches />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coaches/:id"
              element={
                <ProtectedRoute>
                  <CoachDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/players"
              element={
                <ProtectedRoute>
                  <TopPlayers />
                </ProtectedRoute>
              }
            />

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />

            <Route path="/owner/login" element={<OwnerLogin />} />
            <Route
              path="/owner/dashboard"
              element={
                <OwnerProtectedRoute>
                  <OwnerDashboard />
                </OwnerProtectedRoute>
              }
            />
            <Route
              path="/owner/products/:id"
              element={
                <OwnerProtectedRoute>
                  <OwnerProductDetails />
                </OwnerProtectedRoute>
              }
            />

            <Route path="/coach/login" element={<CoachLogin />} />
            <Route
              path="/coach"
              element={
                <CoachProtectedRoute>
                  <CoachDashboard />
                </CoachProtectedRoute>
              }
            />
          </Routes>
        </NotificationsProvider>
      </CartProvider>
    </BrowserRouter>
  );
}
