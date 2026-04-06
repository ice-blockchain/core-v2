import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text, Tooltip, useTheme } from '@ion/ui';
import type { IconName } from '@ion/ui';
import { translate } from '@ion/localization';
import { TopicTooltipContent } from './TopicTooltipContent';

interface TagPillProps {
  iconName: IconName;
  label: string;
  onPress?: () => void;
  pillRef?: React.RefObject<View | null>;
}

function TagPill({ iconName, label, onPress, pillRef }: TagPillProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const pillStyle = useMemo(
    () => ({
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: scale(2),
      backgroundColor: theme.colors.primaryBackground,
      borderRadius: scale(14),
      paddingHorizontal: scale(6),
      paddingVertical: scale(4),
    }),
    [theme, scale],
  );

  return (
    <Pressable ref={pillRef} style={pillStyle} onPress={onPress} accessibilityRole="button">
      <View style={styles.pillContent}>
        <Icon name={iconName} size={scale(16)} color={theme.colors.primaryAccent} />
        <Text variant="caption2" color={theme.colors.primaryAccent}>{label}</Text>
      </View>
      <Icon name="chevron-right" size={scale(14)} color={theme.colors.primaryAccent} />
    </Pressable>
  );
}

function useTooltipState() {
  const ref = useRef<View | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);
  return { ref, isVisible, show, hide };
}

export function CreatePostHeader() {
  const scale = useTheme().scale.scaleSize;
  const topic = useTooltipState();

  const containerStyle = useMemo(
    () => ({ flexDirection: 'row' as const, gap: scale(8), paddingHorizontal: scale(16) }),
    [scale],
  );

  return (
    <View style={containerStyle}>
      <TagPill pillRef={topic.ref} iconName="post-topic" label={translate('feed:addTopicLabel')} onPress={topic.show} />
      <TagPill iconName="post-language" label={translate('feed:languageLabel')} />
      <Tooltip
        targetRef={topic.ref}
        isVisible={topic.isVisible}
        onDismiss={topic.hide}
        position="bottom"
        pointerAlign="left"
        highlightContent={<TagPill iconName="post-topic" label={translate('feed:addTopicLabel')} />}
      >
        <TopicTooltipContent />
      </Tooltip>
    </View>
  );
}

const styles = StyleSheet.create({
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
