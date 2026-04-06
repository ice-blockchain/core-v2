// Platform-resolved entrypoint.
// Metro picks BottomNavBarSheet.native.tsx, Vite picks BottomNavBarSheet.web.tsx.
// This file exists as the TypeScript compilation target and fallback.
export { BottomNavBarSheet } from "./BottomNavBarSheet.web";
