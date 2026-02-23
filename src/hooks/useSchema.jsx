// src/hooks/useSchema.jsx
import { useData } from "./useData";

export function useSchema() {
  const { schema } = useData();
  return { schema };
}