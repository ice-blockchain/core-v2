import { useCallback, useEffect } from "react";
import type { FeedCategory, FeedFilter } from "./feed-filters-menu-types";
import { useOverlayMenu } from "./use-overlay-menu";

interface UseFeedFiltersMenuOptions {
  onCategoryChange: (category: FeedCategory) => void;
  onFilterChange: (filter: FeedFilter) => void;
  isActive: boolean;
}

export function useFeedFiltersMenu(options: UseFeedFiltersMenuOptions) {
  const { onCategoryChange, onFilterChange, isActive } = options;
  const menu = useOverlayMenu();

  useEffect(() => {
    if (!isActive && menu.isOpen) menu.close();
  }, [isActive, menu.isOpen, menu.close]);

  const handleToggle = useCallback(() => { if (isActive) menu.toggle(); }, [isActive, menu.toggle]);

  const handleCategoryChange = useCallback(
    (cat: FeedCategory) => { onCategoryChange(cat); menu.close(); },
    [onCategoryChange, menu.close],
  );

  const handleFilterChange = useCallback(
    (fil: FeedFilter) => { onFilterChange(fil); menu.close(); },
    [onFilterChange, menu.close],
  );

  return { isMenuOpen: menu.isOpen, anchorRef: menu.anchorRef, handleToggle, handleClose: menu.close, handleCategoryChange, handleFilterChange };
}
