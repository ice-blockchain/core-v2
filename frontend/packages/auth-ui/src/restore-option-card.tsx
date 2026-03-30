import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface RestoreOptionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onPress?: () => void;
}

export function RestoreOptionCard({ icon, title, description, onPress }: RestoreOptionCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        {icon}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: "#FAFBFF",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    gap: 8,
  },
  textContainer: {
    alignItems: "center",
    gap: 4,
  },
  title: {
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 18,
    color: "#0E0E0E",
  },
  description: {
    fontWeight: "400",
    fontSize: 11,
    lineHeight: 18,
    color: "#494949",
    textAlign: "center",
    width: 258,
  },
});
