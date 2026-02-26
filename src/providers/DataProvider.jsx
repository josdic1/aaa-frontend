// src/providers/DataProvider.jsx
import { useState, useEffect, useCallback } from "react";
import { DataContext } from "../contexts/DataContext";
import { useAuth } from "../hooks/useAuth";
import { api } from "../utils/api";

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [diningRooms, setDiningRooms] = useState([]);
  const [tables, setTables] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [schema, setSchema] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled([
        api.get("/api/reservations"),
        api.get("/api/menu-items"),
        api.get("/api/dining-rooms"),
        api.get("/api/tables"),
        api.get("/api/members"),
        api.get("/api/schema"),
      ]);

      // Map results to setters
      const setters = [
        setReservations,
        setMenuItems,
        setDiningRooms,
        setTables,
        setMembers,
        setSchema,
      ];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          setters[index](result.value);
        } else {
          console.error(
            `❌ DataProvider: Request ${index} failed:`,
            result.reason,
          );
          // Optional: Set a partial error state so the UI knows some data is missing
        }
      });
    } catch (err) {
      // This only catches if the actual code inside 'try' breaks
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const value = {
    // data
    reservations,
    menuItems,
    diningRooms,
    tables,
    members,
    schema,

    // state
    loading,
    error,

    // actions
    refresh: fetchAll,

    // setters for optimistic updates later
    setReservations,
    setMenuItems,
    setMembers,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
