import { useCallback, useState } from "react";
import type { BottomNavBarTabIndex } from "@ion/ui";

export function useMainTabState() {
  const [activeTab, setActiveTab] = useState<BottomNavBarTabIndex>(0);
  const [isSheetOpen, setSheetOpen] = useState(false);

  const handleTabPress = useCallback((index: BottomNavBarTabIndex) => {
    setSheetOpen(false);
    setActiveTab(index);
  }, []);

  const handleCenterPress = useCallback(() => {
    // TODO: haptic feedback
    setSheetOpen((prev) => !prev);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
  }, []);

  return { activeTab, isSheetOpen, handleTabPress, handleCenterPress, handleSheetClose };
}
