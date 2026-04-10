import { useMemo } from 'react';
import { View } from 'react-native';
import { Icon, useTheme } from '@ion/ui';

export function PlaceholderAvatar() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const avatarStyle = useMemo(
    () => ({
      width: scale(30),
      height: scale(30),
      borderRadius: scale(10),
      backgroundColor: theme.colors.sheetLine,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    }),
    [theme, scale],
  );

  return (
    <View style={avatarStyle}>
      <Icon name="profile-noimage" size={scale(20)} color={theme.colors.secondaryText} />
    </View>
  );
}
