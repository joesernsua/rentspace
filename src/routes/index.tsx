import { createBrowserRouter, Navigate, useLocation } from "react-router";
import App from "../App";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import ChatPage from "../pages/ChatPage";
import FavoritesPage from "../pages/FavoritesPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import OwnerDashboardPage from "../pages/OwnerDashboardPage";
import PropertyDetailsPage from "../pages/PropertyDetailsPage";
import PropertyListingPage from "../pages/PropertyListingPage";
import RegisterPage from "../pages/RegisterPage";
import TenantDashboardPage from "../pages/TenantDashboardPage";

function IndexHtmlRedirect() {
  const location = useLocation();
  return <Navigate to={`/${location.hash || "#home"}`} replace />;
}

const router = createBrowserRouter([
  {
    path: "/index.html",
    element: <IndexHtmlRedirect />,
  },
  {
    path: "/login.html",
    element: <LoginPage />,
  },
  {
    path: "/login",
    element: <Navigate to="/login.html" replace />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "about", element: <Navigate to="/#about-us" replace /> },
      { path: "help", element: <Navigate to="/#help" replace /> },
      { path: "properties.php", element: <PropertyListingPage /> },
      { path: "properties", element: <PropertyListingPage /> },
      { path: "properties/:id", element: <PropertyDetailsPage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "favorites", element: <FavoritesPage /> },
      {
        path: "dashboard.html",
        element: <ProtectedRoute role="tenant"><TenantDashboardPage /></ProtectedRoute>,
      },
      {
        path: "dashboard",
        element: <Navigate to="/dashboard.html" replace />,
      },
      {
        path: "tenant-dashboard",
        element: <ProtectedRoute role="tenant"><TenantDashboardPage /></ProtectedRoute>,
      },
      {
        path: "owner-dashboard",
        element: <ProtectedRoute role="owner"><OwnerDashboardPage /></ProtectedRoute>,
      },
      {
        path: "admin-dashboard",
        element: <ProtectedRoute role="admin"><AdminDashboardPage /></ProtectedRoute>,
      },
    ],
  },
]);

export default router;
