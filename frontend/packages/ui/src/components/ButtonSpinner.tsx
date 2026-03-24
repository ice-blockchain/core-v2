import { ActivityIndicator } from "react-native";

interface ButtonSpinnerProps {
  color: string;
  size?: number;
}

export function ButtonSpinner({ color, size = 20 }: ButtonSpinnerProps) {
  return <ActivityIndicator color={color} size={size} />;
}
