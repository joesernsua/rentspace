import { createBrowserRouter, Navigate, useLocation } from "react-router";
import App from "../App";
import AdminProtectedRoute from "../components/AdminProtectedRoute";
import PageTitle from "../components/PageTitle";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminLoginPage from "../pages/AdminLoginPage";
import AdminUserProfilePage from "../pages/AdminUserProfilePage";
import ChatPage from "../pages/ChatPage";
import FavoritesPage from "../pages/FavoritesPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import MyRentalsPage from "../pages/MyRentalsPage";
import OwnerDashboardPage from "../pages/OwnerDashboardPage";
import PropertyDetailsPage from "../pages/PropertyDetailsPage";
import PropertyListingPage from "../pages/PropertyListingPage";
import RegisterPage from "../pages/RegisterPage";
import TenantDashboardPage from "../pages/TenantDashboardPage";

function IndexHtmlRedirect() {
  const location = useLocation();
  return <Navigate to={`/${location.hash || "#home"}`} replace />;
}

function titled(title: string, element: React.ReactNode) {
  return <PageTitle title={title}>{element}</PageTitle>;
}

const router = createBrowserRouter([
  {
    path: "/index.html",
    element: <IndexHtmlRedirect />,
  },
  {
    path: "/login.html",
    element: titled("Login", <LoginPage />),
  },
  {
    path: "/login",
    element: <Navigate to="/login.html" replace />,
  },
  {
    path: "/register",
    element: titled("Register", <RegisterPage />),
  },
  {
    path: "/admin-login",
    element: titled("Admin Login", <AdminLoginPage />),
  },
  {
    path: "/admin-login.html",
    element: titled("Admin Login", <AdminLoginPage />),
  },
  {
    path: "/admin-dashboard",
    element: titled("Admin Dashboard", <AdminProtectedRoute><AdminDashboardPage /></AdminProtectedRoute>),
  },
  {
    path: "/admin-users/:uid",
    element: titled("Admin User Profile", <AdminProtectedRoute><AdminUserProfilePage /></AdminProtectedRoute>),
  },
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: titled("RentSpace", <HomePage />) },
      { path: "about", element: <Navigate to="/#about-us" replace /> },
      { path: "help", element: <Navigate to="/#help" replace /> },
      { path: "properties.php", element: titled("Properties", <PropertyListingPage />) },
      { path: "properties", element: titled("Properties", <PropertyListingPage />) },
      { path: "properties/:id", element: titled("Property Details", <PropertyDetailsPage />) },
      { path: "chat", element: titled("Chat", <ChatPage />) },
      { path: "favorites", element: titled("Favorites", <FavoritesPage />) },
      {
        path: "dashboard.html",
        element: titled("Tenant Dashboard", <ProtectedRoute role="tenant"><TenantDashboardPage /></ProtectedRoute>),
      },
      {
        path: "dashboard",
        element: <Navigate to="/dashboard.html" replace />,
      },
      {
        path: "tenant-dashboard",
        element: titled("Tenant Dashboard", <ProtectedRoute role="tenant"><TenantDashboardPage /></ProtectedRoute>),
      },
      {
        path: "my-rentals",
        element: titled("My Rentals", <ProtectedRoute role="tenant"><MyRentalsPage /></ProtectedRoute>),
      },
      {
        path: "owner-dashboard",
        element: titled("Owner Dashboard", <ProtectedRoute role="owner"><OwnerDashboardPage /></ProtectedRoute>),
      },
    ],
  },
]);

export default router;
