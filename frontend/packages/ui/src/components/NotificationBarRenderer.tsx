import { useTheme } from "../theme/ThemeProvider";
import { NotificationBarAnimatedContainer } from "./NotificationBarAnimatedContainer";
import { NotificationBarContent } from "./NotificationBarContent";
import type { NotificationBarItem } from "./NotificationBarTypes";

interface NotificationBarRendererProps {
  activeItem: NotificationBarItem | null;
  isVisible: boolean;
  onHideComplete: () => void;
}

export function NotificationBarRenderer(props: NotificationBarRendererProps) {
  const { activeItem, isVisible, onHideComplete } = props;
  const theme = useTheme();

  return (
    <NotificationBarAnimatedContainer
      isVisible={isVisible}
      scale={theme.scale}
      onHideComplete={onHideComplete}
    >
      {activeItem ? (
        <NotificationBarContent
          message={activeItem.message}
          icon={activeItem.icon}
          suffixAction={activeItem.suffixAction}
          backgroundColor={activeItem.backgroundColor}
        />
      ) : null}
    </NotificationBarAnimatedContainer>
  );
}
