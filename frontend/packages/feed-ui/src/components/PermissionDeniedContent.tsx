import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Button, Icon, Text, useTheme } from '@ion/ui';
import type { IconName } from '@ion/ui';
import { buildDeniedContainerStyle, buildDeniedHeaderStyle, buildDeniedBodyStyle, buildDeniedIconCircleStyle } from './permission-denied-styles';

const HEADER_ICON_SIZE = 36;
const BUTTON_WIDTH = 287;

interface PermissionDeniedContentProps {
  iconName: IconName;
  headerTitle: string;
  illustration: ReactNode;
  bodyTitle: string;
  bodyDescription: string;
  buttonLabel: string;
  onGoToSettings: () => void;
}

function DeniedHeader({ iconName, headerTitle }: Pick<PermissionDeniedContentProps, 'iconName' | 'headerTitle'>) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const headerStyle = useMemo(() => buildDeniedHeaderStyle(scale), [scale]);
  const circleStyle = useMemo(() => buildDeniedIconCircleStyle(scale, theme.colors.primaryAccent), [scale, theme.colors]);

  return (
    <View style={headerStyle}>
      <View style={circleStyle}>
        <Icon name={iconName} size={scale(HEADER_ICON_SIZE)} color={theme.colors.onPrimaryAccent} />
      </View>
      <Text variant="headline1">{headerTitle}</Text>
    </View>
  );
}

function DeniedBody({ illustration, bodyTitle, bodyDescription }: Pick<PermissionDeniedContentProps, 'illustration' | 'bodyTitle' | 'bodyDescription'>) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const bodyStyle = useMemo(() => buildDeniedBodyStyle(scale), [scale]);

  return (
    <View style={bodyStyle}>
      {illustration}
      <Text variant="title">{bodyTitle}</Text>
      <Text variant="body2" color={theme.colors.secondaryText} style={{ textAlign: 'center' }}>
        {bodyDescription}
      </Text>
    </View>
  );
}

export function PermissionDeniedContent(props: PermissionDeniedContentProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const containerStyle = useMemo(() => buildDeniedContainerStyle(), []);
  const buttonWidth = useMemo(() => ({ width: scale(BUTTON_WIDTH) }), [scale]);

  return (
    <View style={containerStyle}>
      <DeniedHeader iconName={props.iconName} headerTitle={props.headerTitle} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <DeniedBody illustration={props.illustration} bodyTitle={props.bodyTitle} bodyDescription={props.bodyDescription} />
      </View>
      <View style={buttonWidth}>
        <Button height={56} color="primary" label={props.buttonLabel} onPress={props.onGoToSettings} />
      </View>
    </View>
  );
}
