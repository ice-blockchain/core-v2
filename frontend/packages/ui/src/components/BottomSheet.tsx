// Platform-resolved entrypoint.
// Metro picks BottomSheet.native.tsx, Vite picks BottomSheet.web.tsx.
// This file exists as the TypeScript compilation target and fallback.
export { BottomSheet } from "./BottomSheet.web";
export type { BottomSheetProps } from "./bottom-sheet-types";
