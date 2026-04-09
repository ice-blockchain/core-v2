import { Fragment, useCallback, useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HorizontalSeparator, Icon, ListItemSkeleton, SkeletonPulse, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import {
  buildScreenStyle,
  buildHeaderStyle,
  buildHeaderTitleStyle,
  buildSearchContainerStyle,
} from "./empty-conversations-styles";
import { buildSkeletonListStyle, buildSearchSkeletonStyle } from "./loading-conversations-styles";

const SKELETON_ROWS: ReadonlyArray<{ nameWidth: number; messageWidth: number }> = [
  { nameWidth: 221, messageWidth: 174 },
  { nameWidth: 221, messageWidth: 148 },
  { nameWidth: 195, messageWidth: 174 },
  { nameWidth: 191, messageWidth: 221 },
  { nameWidth: 190, messageWidth: 147 },
  { nameWidth: 221, messageWidth: 171 },
  { nameWidth: 124, messageWidth: 197 },
  { nameWidth: 166, messageWidth: 110 },
  { nameWidth: 221, messageWidth: 182 },
  { nameWidth: 195, messageWidth: 160 },
];

function useScreenStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return {
    screen: useMemo(() => buildScreenStyle(theme.colors.secondaryBackground), [theme.colors.secondaryBackground]),
    header: useMemo(() => buildHeaderStyle(scale), [scale]),
    headerTitle: useMemo(() => buildHeaderTitleStyle(), []),
    searchContainer: useMemo(() => buildSearchContainerStyle(scale), [scale]),
    searchSkeleton: useMemo(() => buildSearchSkeletonStyle(scale, theme.colors.tertiaryBackground), [scale, theme.colors.tertiaryBackground]),
    skeletonList: useMemo(() => buildSkeletonListStyle(scale), [scale]),
  };
}

function ScreenHeader({ onEdit, onCompose }: {
  readonly onEdit?: () => void;
  readonly onCompose?: () => void;
}) {
  const theme = useTheme();
  const styles = useScreenStyles();

  return (
    <View style={styles.header}>
      <Pressable onPress={onEdit} testID="edit-button">
        <Text variant="subtitle2" color={theme.colors.primaryAccent}>{translate("chat:editButton")}</Text>
      </Pressable>
      <Text variant="subtitle2" style={styles.headerTitle}>{translate("chat:chatsTitle")}</Text>
      <Pressable onPress={onCompose} testID="compose-button">
        <Icon name="edit-link" size={24} color={theme.colors.primaryAccent} />
      </Pressable>
    </View>
  );
}

export function LoadingConversationsListScreen() {
  const styles = useScreenStyles();
  const insets = useSafeAreaInsets();

  const handleCompose = useCallback(() => {}, []);
  const handleEdit = useCallback(() => {}, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="loading-conversations-screen">
      <ScreenHeader onEdit={handleEdit} onCompose={handleCompose} />
      <SkeletonPulse style={{ flex: 1 }}>
        <View style={styles.searchContainer}>
          <View style={styles.searchSkeleton} />
        </View>
        <ScrollView contentContainerStyle={styles.skeletonList} showsVerticalScrollIndicator={false}>
          {SKELETON_ROWS.map((row, index) => (
            <Fragment key={index}>
              <HorizontalSeparator />
              <ListItemSkeleton nameWidth={row.nameWidth} messageWidth={row.messageWidth} />
            </Fragment>
          ))}
          <HorizontalSeparator />
        </ScrollView>
      </SkeletonPulse>
    </View>
  );
}
