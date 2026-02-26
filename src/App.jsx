import { Outlet } from "react-router-dom";
import { NavBar } from "./components/shared/NavBar";
import { Toaster } from "sonner";
import { DevHUD } from "./components/DevHUD";

export default function App() {
  return (
    <>
      {import.meta.env.VITE_DEV_HUD === "1" && (
        <div
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 999999,
            pointerEvents: "auto",
          }}
        >
          <DevHUD />
        </div>
      )}

      <header>
        <NavBar />
      </header>

      <main style={{ width: "100%", overflowX: "hidden" }}>
        <Outlet />
      </main>

      <Toaster position="bottom-right" />
    </>
  );
}
