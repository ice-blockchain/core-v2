import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { BackArrowIcon } from "./back-arrow-icon";

interface SheetHeaderProps {
  title: string;
  onBack: () => void;
}

export function SheetHeader({ title, onBack }: SheetHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <BackArrowIcon color={colors.primaryText} />
      </Pressable>
      <Text variant="subtitle" color={colors.primaryText}>{title}</Text>
      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    width: 24,
    height: 24,
    opacity: 0,
  },
});
