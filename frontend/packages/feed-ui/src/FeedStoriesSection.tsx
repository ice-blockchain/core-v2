import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { AddStoryAvatar, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { buildSectionStyle, buildStoryItemStyle } from "./feed-stories-styles";
import { FEED_NAMESPACE } from "./translations";

export function FeedStoriesSection() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const sectionStyle = useMemo(() => buildSectionStyle(scale), [scale]);
  const itemStyle = useMemo(() => buildStoryItemStyle(), []);
  const handleAddStory = useCallback(() => {}, []);

  return (
    <View style={sectionStyle}>
      <View style={itemStyle}>
        <AddStoryAvatar onPress={handleAddStory} />
        <Text variant="caption3" color={theme.colors.primaryText}>
          {translate(`${FEED_NAMESPACE}:storyYouLabel`)}
        </Text>
      </View>
    </View>
  );
}
