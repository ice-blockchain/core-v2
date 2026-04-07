import { useCallback, useEffect, useRef, useState } from "react";
import type { View } from "react-native";
import type { FeedCategory, FeedFilter } from "./feed-filters-menu-types";

interface UseFeedFiltersMenuOptions {
  onCategoryChange: (category: FeedCategory) => void;
  onFilterChange: (filter: FeedFilter) => void;
  isActive: boolean;
}

export function useFeedFiltersMenu(options: UseFeedFiltersMenuOptions) {
  const { onCategoryChange, onFilterChange, isActive } = options;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const anchorRef = useRef<View>(null);

  useEffect(() => {
    if (!isActive && isMenuOpen) setIsMenuOpen(false);
  }, [isActive, isMenuOpen]);

  const handleToggle = useCallback(() => setIsMenuOpen((prev) => !prev), []);
  const handleClose = useCallback(() => setIsMenuOpen(false), []);

  const handleCategoryChange = useCallback(
    (cat: FeedCategory) => { onCategoryChange(cat); setIsMenuOpen(false); },
    [onCategoryChange],
  );

  const handleFilterChange = useCallback(
    (fil: FeedFilter) => { onFilterChange(fil); setIsMenuOpen(false); },
    [onFilterChange],
  );

  return { isMenuOpen, anchorRef, handleToggle, handleClose, handleCategoryChange, handleFilterChange };
}
