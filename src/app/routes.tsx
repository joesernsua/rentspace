import { createBrowserRouter } from "react-router";
import Home from "./Home";
import App from "../App";
import AdminDashboard from "./AdminDashboard";
import PropertiesPage from "./PropertiesPage";
import PropertyDetails from "./PropertyDetails";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "admin",
        element: <AdminDashboard />,
      },
      {
        path: "properties",
        element: <PropertiesPage />,
      },
      {
        path: "properties/:id",
        element: <PropertyDetails />,
      },
    ],
  },
]);

export default router;
