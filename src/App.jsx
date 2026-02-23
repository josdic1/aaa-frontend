// src/App.jsx
import { Outlet } from "react-router-dom";
import { NavBar } from "./components/shared/NavBar";
import { Toaster } from "sonner";

export default function App() {
  return (
    <>
      <header>
        <NavBar />
      </header>
      <main>
        <Outlet />
      </main>
      <Toaster position="bottom-right" />
    </>
  );
}
