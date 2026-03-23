import { View, type ViewProps } from "react-native";

export type BoxProps = ViewProps;

export function Box({ style, ...props }: BoxProps) {
  return <View style={style} {...props} />;
}
