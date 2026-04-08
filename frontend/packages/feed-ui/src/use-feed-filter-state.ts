import { useState, useCallback } from "react";
import type { FeedCategory, FeedFilter } from "@ion/ui";

export function useFeedFilterState() {
  const [category, setCategory] = useState<FeedCategory>("feed");
  const [filter, setFilter] = useState<FeedFilter>("forYou");

  const handleCategoryChange = useCallback((cat: FeedCategory) => setCategory(cat), []);
  const handleFilterChange = useCallback((fil: FeedFilter) => setFilter(fil), []);

  return { category, filter, onCategoryChange: handleCategoryChange, onFilterChange: handleFilterChange };
}
