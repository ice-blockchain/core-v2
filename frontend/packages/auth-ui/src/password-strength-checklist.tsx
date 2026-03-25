import { StyleSheet, Text, View } from "react-native";
import { CheckIcon } from "./check-icon";
import { CrossIcon } from "./cross-icon";

interface PasswordRule {
  label: string;
  isMet: boolean;
}

interface PasswordStrengthChecklistProps {
  rules: PasswordRule[];
}

export function PasswordStrengthChecklist({ rules }: PasswordStrengthChecklistProps) {
  return (
    <View style={styles.container}>
      {rules.map((rule) => (
        <View key={rule.label} style={styles.row}>
          {rule.isMet ? <CheckIcon /> : <CrossIcon />}
          <Text style={styles.label}>{rule.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontWeight: "400",
    fontSize: 12,
    color: "#0E0E0E",
  },
});
