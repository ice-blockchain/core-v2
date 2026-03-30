import { Pressable, View } from "react-native";
import { Text } from "../components/Text";
import { Icon } from "../icons/Icon";
import { useTheme } from "../theme/ThemeProvider";

interface DemoSheetHeaderProps {
  title: string;
  onBack: () => void;
  onClose: () => void;
}

export function DemoSheetHeader({ title, onBack, onClose }: DemoSheetHeaderProps) {
  const theme = useTheme();
  const iconSize = theme.scale.scaleSize(24);
  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    }}>
      <Pressable onPress={onBack} hitSlop={8}>
        <Icon name="back-arrow" size={iconSize} color={theme.colors.primaryText} />
      </Pressable>
      <Text variant="subtitle">{title}</Text>
      <Pressable onPress={onClose} hitSlop={8}>
        <Icon name="close" size={iconSize} color={theme.colors.primaryText} />
      </Pressable>
    </View>
  );
}
