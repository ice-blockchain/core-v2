import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Edge } from "react-native-safe-area-context";

export interface SafeAreaWrapperProps {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const ALL_EDGES: Edge[] = ["top", "bottom", "left", "right"];

const BASE_STYLE: ViewStyle = { flex: 1 };

export function SafeAreaWrapper({ children, edges = ALL_EDGES, style, testID }: SafeAreaWrapperProps) {
  return (
    <SafeAreaView edges={edges} style={[BASE_STYLE, style]} testID={testID}>
      {children}
    </SafeAreaView>
  );
}
