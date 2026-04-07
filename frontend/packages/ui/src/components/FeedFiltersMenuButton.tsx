import { View } from "react-native";
import { OverlayMenu } from "./OverlayMenu";
import { FeedFiltersMenuTrigger } from "./FeedFiltersMenuTrigger";
import { FeedFiltersMenuOverlay } from "./FeedFiltersMenuOverlay";
import type { FeedFiltersMenuButtonProps } from "./feed-filters-menu-types";
import { useFeedFiltersMenu } from "./use-feed-filters-menu";

interface MenuLabels {
  feed: string;
  videos: string;
  articles: string;
  forYou: string;
  following: string;
}

export function FeedFiltersMenuButton(props: FeedFiltersMenuButtonProps & { labels: MenuLabels }) {
  const { category, filter, onCategoryChange, onFilterChange, isActive = true, labels } = props;
  const menu = useFeedFiltersMenu({ onCategoryChange, onFilterChange, isActive });

  return (
    <View collapsable={false}>
      <FeedFiltersMenuTrigger ref={menu.anchorRef} category={category} filter={filter} onPress={menu.handleToggle} />
      <OverlayMenu isVisible={menu.isMenuOpen} onClose={menu.handleClose} anchorRef={menu.anchorRef}>
        <FeedFiltersMenuOverlay category={category} filter={filter} onCategoryChange={menu.handleCategoryChange} onFilterChange={menu.handleFilterChange} labels={labels} />
      </OverlayMenu>
    </View>
  );
}
