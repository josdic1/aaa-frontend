// src/router.jsx
import App from "./App";
import { AdminRoute } from "./components/AdminRoute";
import { AdminPage } from "./pages/AdminPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { MembersPage } from "./pages/MembersPage";
import { MenuPage } from "./pages/MenuPage";
import { SignupPage } from "./pages/SignupPage";
import { HomePage } from "./pages/HomePage";
import { ErrorPage } from "./pages/ErrorPage";
import { ReservationFormPage } from "./pages/ReservationFormPage";
import { ReservationDetailPage } from "./pages/ReservationDetailPage";
import { FloorViewPage } from "./pages/FloorViewPage";
import { AdminOverlord } from "./pages/AdminOverlord";

export const routes = [
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "members", element: <MembersPage /> },
          { path: "reservations/new", element: <ReservationFormPage /> },
          { path: "reservations/:id", element: <ReservationDetailPage /> },
          { path: "/menu", element: <MenuPage /> },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          { path: "admin", element: <AdminPage /> },
          { path: "floor", element: <FloorViewPage /> },
          { path: "overlord", element: <AdminOverlord /> },
        ],
      },
    ],
  },
];
