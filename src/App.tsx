import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import Navbar from "./components/Navbar";
import "./style/index.css";

export default function App() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const section = document.getElementById(location.hash.slice(1));
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash, location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <Outlet />
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500 transition-colors dark:border-white/10 dark:bg-slate-950 dark:text-slate-400">
        Property Rental Management System
      </footer>
    </div>
  );
}
