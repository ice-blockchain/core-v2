import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import { BottomSheet, Button, Text, useTheme } from '@ion/ui';
import { translate } from '@ion/localization';
import { buildPromptContainerStyle, buildPromptTextContainerStyle, buildPromptButtonRowStyle } from './permission-prompt-styles';

const FULL_FLEX = { flex: 1 } as const;

interface PermissionPromptSheetProps {
  isVisible: boolean;
  onAllow: () => void;
  onDismiss: () => void;
  illustration: ReactNode;
  title: string;
  description: string;
}

function PromptContent({ illustration, title, description, onAllow, onDismiss }: Omit<PermissionPromptSheetProps, 'isVisible'>) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(() => buildPromptContainerStyle(scale), [scale]);
  const textContainerStyle = useMemo(() => buildPromptTextContainerStyle(scale), [scale]);
  const buttonRowStyle = useMemo(() => buildPromptButtonRowStyle(scale), [scale]);

  return (
    <View style={containerStyle}>
      {illustration}
      <View style={textContainerStyle}>
        <Text variant="title">{title}</Text>
        <Text variant="body2" color={theme.colors.secondaryText}>{description}</Text>
      </View>
      <View style={buttonRowStyle}>
        <View style={FULL_FLEX}>
          <Button height={56} color="tertiary" label={translate('feed:dontAllowButton')} onPress={onDismiss} />
        </View>
        <View style={FULL_FLEX}>
          <Button height={56} color="primary" label={translate('feed:allowButton')} onPress={onAllow} />
        </View>
      </View>
    </View>
  );
}

export function PermissionPromptSheet(props: PermissionPromptSheetProps) {
  const { isVisible, onDismiss, ...contentProps } = props;

  return (
    <BottomSheet isVisible={isVisible} onClose={onDismiss}>
      <PromptContent {...contentProps} onDismiss={onDismiss} />
    </BottomSheet>
  );
}
