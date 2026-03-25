import { Pressable, StyleSheet, Text, View } from "react-native";
import { BackArrowIcon } from "./back-arrow-icon";

interface SheetHeaderProps {
  title: string;
  onBack: () => void;
}

export function SheetHeader({ title, onBack }: SheetHeaderProps) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <BackArrowIcon />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
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
  title: {
    fontWeight: "600",
    fontSize: 15,
    color: "#0E0E0E",
    textAlign: "center",
  },
  placeholder: {
    width: 24,
    height: 24,
    opacity: 0,
  },
});
