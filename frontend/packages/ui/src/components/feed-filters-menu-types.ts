import type { IconName } from "../icons/icon-types";

export type FeedCategory = "feed" | "videos" | "articles";
export type FeedFilter = "forYou" | "following";

export interface FeedFiltersMenuButtonProps {
  category: FeedCategory;
  filter: FeedFilter;
  onCategoryChange: (category: FeedCategory) => void;
  onFilterChange: (filter: FeedFilter) => void;
  isActive?: boolean;
}

export interface CategoryConfig {
  iconName: IconName;
  color: string;
}

export interface FilterConfig {
  iconName: IconName;
}
