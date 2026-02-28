// src/App.jsx
import { Outlet, useLocation } from "react-router-dom";
import { NavBar } from "./components/shared/NavBar";
import { Toaster } from "sonner";
import { DevHUD } from "./components/DevHUD";

export default function App() {
  const { pathname } = useLocation();
  const isMobile = pathname.startsWith("/mobile");

  return (
    <>
      {import.meta.env.VITE_DEV_HUD === "1" && <DevHUD />}

      {!isMobile && (
        <header>
          <NavBar />
        </header>
      )}

      <main
        style={{
          width: "100%",
          overflowX: "hidden",
          ...(isMobile ? { height: "100dvh", overflow: "hidden" } : {}),
        }}
      >
        <Outlet />
      </main>

      <Toaster position="bottom-right" />
    </>
  );
}
