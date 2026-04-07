// Platform-resolved entrypoint.
// Metro picks Tooltip.native.tsx, Vite picks Tooltip.web.tsx.
export { Tooltip } from './Tooltip.web';
export type { TooltipProps } from './tooltip-types';
