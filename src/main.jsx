// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./providers/AuthProvider.jsx";
import { DataProvider } from "./providers/DataProvider.jsx";
import { routes } from "./router.jsx";
import "./index.css";

const router = createBrowserRouter(routes);

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <AuthProvider>
      <DataProvider>
        <RouterProvider router={router} />
      </DataProvider>
    </AuthProvider>
  </StrictMode>,
);
