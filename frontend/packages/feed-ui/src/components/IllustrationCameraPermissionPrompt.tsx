import { SvgXml } from 'react-native-svg';
import { useTheme } from '@ion/ui';
import { useMemo } from 'react';

const SVG_XML = '<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="translate(15.08,1.95)"><path d="M25.02 6.1H13.54c-.94 0-1.78-.6-2.07-1.5L10.11.55h18.34l-1.35 4.06a3.1 3.1 0 01-2.08 1.49zm10.26 60.05v2.42c0 2.34-1.9 4.24-4.24 4.24H12.28c-1.51 0-2.74 1.22-2.74 2.73h21.49c3.86 0 6.98-3.13 6.98-6.98v-1.33l-2.73-1.09z" fill="#E1EAF8"/><path d="M31.03 76.09H7.53C3.38 76.09 0 72.72 0 68.57v-8.73c0-.3.25-.55.55-.55s.55.25.55.55v8.73c0 3.55 2.89 6.43 6.43 6.43h23.51c3.55 0 6.43-2.89 6.43-6.43v-1.33c0-.3.25-.55.55-.55s.55.25.55.55v1.33c0 4.15-3.38 7.52-7.53 7.52z" fill="#9A9A9A"/><path d="M37.46 7.53v23.54c0 .3.25.55.55.55s.55-.25.55-.55V7.53c0-4.15-3.38-7.53-7.53-7.53H7.53C3.38 0 0 3.38 0 7.53v48.06c0 .3.25.55.55.55s.55-.25.55-.55V7.53c0-3.55 2.89-6.43 6.43-6.43h23.51c3.55 0 6.43 2.89 6.43 6.43z" fill="#9A9A9A"/><path d="M21.23 42.78a.55.55 0 01-.24-.06l-3.65-1.81a.55.55 0 01.49-.98l3.65 1.81a.55.55 0 01-.25 1.04zm-3.43 14.17a.55.55 0 01-.49-.31.55.55 0 01.25-.73l3.65-1.79a.55.55 0 01.49.97l-3.65 1.79a.54.54 0 01-.25.07zm37.42-16.74a.55.55 0 01-.47-.27.55.55 0 01.2-.75l3.53-2.03a.55.55 0 01.55.95l-3.53 2.03a.54.54 0 01-.28.07zM44.8 33.52a.55.55 0 01-.54-.62l.54-4.03a.55.55 0 011.09.15l-.54 4.03a.55.55 0 01-.54.47z" fill="#0166FF"/></g><g transform="translate(34,21.25)"><path d="M17.49 5.47h-2.67V4.25a4.25 4.25 0 00-4.25-4.25H9.43a4.25 4.25 0 00-4.25 4.25v1.22H2.51A2.51 2.51 0 000 7.98v12.03a2.51 2.51 0 002.51 2.51h14.98A2.51 2.51 0 0020 20.01V7.98a2.51 2.51 0 00-2.51-2.51zM10 19.52a5.52 5.52 0 110-11.04 5.52 5.52 0 010 11.04z" fill="#E1EAF8"/></g><g transform="translate(42,40)"><rect width="22" height="22" rx="11" fill="#0166FF"/><path d="M7 10.81l2.81 2.81 5.63-5.63" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></g></svg>';

const ILLUSTRATION_SIZE = 80;

export function IllustrationCameraPermissionPrompt() {
  const theme = useTheme();
  const size = theme.scale.scaleSize(ILLUSTRATION_SIZE);
  const dimensions = useMemo(() => ({ width: size, height: size }), [size]);

  return <SvgXml xml={SVG_XML} {...dimensions} />;
}
