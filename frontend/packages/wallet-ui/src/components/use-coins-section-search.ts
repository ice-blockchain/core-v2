import { useCallback, useState } from "react";

export function useCoinsSectionSearch() {
  const [isActive, setIsActive] = useState(false);
  const [query, setQuery] = useState("");
  const activate = useCallback(() => setIsActive(true), []);
  const cancel = useCallback(() => {
    setIsActive(false);
    setQuery("");
  }, []);
  return { isActive, query, setQuery, activate, cancel };
}
