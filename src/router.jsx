// src/router.jsx
import { Navigate } from "react-router-dom";
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
import { useAuth } from "./hooks/useAuth";
import { KnownIssues } from "./pages/KnownIssues";
import { CalendarPage } from "./pages/CalendarPage";
import { MobileHub } from "./pages/mobile/MobileHub";

function RootIndex() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "admin" || user.role === "staff") {
    return <Navigate to="/admin" replace />;
  }

  // Auto-redirect members on mobile to the hub home screen
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    return <Navigate to="/mobile" replace />;
  }

  return <HomePage />;
}

export const routes = [
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "menu", element: <MenuPage /> },
      { path: "issues", element: <KnownIssues /> },

      // IMPORTANT: index is NOT wrapped by ProtectedRoute.
      // RootIndex alone decides where "/" should go.
      { index: true, element: <RootIndex /> },

      {
        element: <ProtectedRoute />,
        children: [
          // Mobile hub — fully self-contained, handles its own screens internally.
          // Does NOT navigate out to desktop routes.
          { path: "mobile", element: <MobileHub /> },

          // Desktop routes (members, reservations, etc.)
          // On mobile, users go through /mobile not these paths.
          { path: "home", element: <HomePage /> },
          { path: "members", element: <MembersPage /> },
          { path: "reservations/new", element: <ReservationFormPage /> },
          { path: "reservations/:id", element: <ReservationDetailPage /> },
        ],
      },

      {
        element: <AdminRoute />,
        children: [
          { path: "admin", element: <AdminPage /> },
          { path: "floor", element: <FloorViewPage /> },
          { path: "overlord", element: <AdminOverlord /> },
          { path: "calendar", element: <CalendarPage /> },
        ],
      },
    ],
  },
];
