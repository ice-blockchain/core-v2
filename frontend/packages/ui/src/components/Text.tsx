import { Text as RNText, type TextProps } from "react-native";

export type { TextProps };

export function Text({ style, ...props }: TextProps) {
  return <RNText style={style} {...props} />;
}
