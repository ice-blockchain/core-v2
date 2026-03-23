import { Pressable, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

export interface ButtonProps extends PressableProps {
  label: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, style, ...props }: ButtonProps) {
  return (
    <Pressable style={style} {...props}>
      <Text>{label}</Text>
    </Pressable>
  );
}
