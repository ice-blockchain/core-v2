import { useCallback, useEffect, useRef, useState } from "react";
import type { SelectFieldDropdownProps } from "./select-field-dropdown-types";
import { DROPDOWN_GAP } from "./select-field-dropdown-types";
import { useTheme } from "../theme/ThemeProvider";

export type { SelectOption } from "./select-field-dropdown-types";
export { SELECT_FIELD_Z_INDEX } from "./select-field-dropdown-types";

interface AnchorRect { x: number; y: number; width: number; height: number }

function useMeasureAnchor(anchorRef: SelectFieldDropdownProps["anchorRef"], isVisible: boolean) {
  const [rect, setRect] = useState<AnchorRect | null>(null);

  useEffect(() => {
    if (!isVisible) { setRect(null); return; }
    requestAnimationFrame(() => {
      const node = anchorRef.current as unknown as HTMLElement | null;
      if (!node) return;
      const r = node.getBoundingClientRect();
      if (r.width > 0) setRect({ x: r.x, y: r.y, width: r.width, height: r.height });
    });
  }, [isVisible, anchorRef]);

  return rect;
}

function usePortalContainer() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const div = document.createElement("div");
    div.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;pointer-events:none;";
    document.body.appendChild(div);
    ref.current = div;
    return () => { document.body.removeChild(div); };
  }, []);

  return ref;
}

function buildDropdownCss(rect: AnchorRect, theme: ReturnType<typeof useTheme>) {
  const { scaleSize, scaleRadius } = theme.scale;
  const top = rect.y + rect.height + scaleSize(DROPDOWN_GAP);
  return [
    `position:fixed`, `top:${top}px`, `left:${rect.x}px`, `width:${rect.width}px`,
    `border-radius:${scaleRadius(16)}px`, `border:1px solid ${theme.colors.strokeElements}`,
    `background:${theme.colors.secondaryBackground}`,
    `padding:${scaleSize(16)}px ${scaleSize(24)}px ${scaleSize(16)}px ${scaleSize(16)}px`,
    `display:flex`, `flex-direction:column`, `gap:${scaleSize(16)}px`, `box-sizing:border-box`,
  ].join(";");
}

function buildOptionRow(label: string, isDisabled: boolean, onSelect: () => void) {
  const row = document.createElement("div");
  row.style.cssText = `cursor:pointer;opacity:${isDisabled ? 0.5 : 1};font-family:NotoSans-SemiBold,sans-serif;font-size:13px;`;
  row.textContent = label;
  if (!isDisabled) row.addEventListener("click", onSelect);
  return row;
}

function renderPortalContent(options: { container: HTMLDivElement; rect: AnchorRect; props: SelectFieldDropdownProps; theme: ReturnType<typeof useTheme> }) {
  const { container, rect, props, theme } = options;
  const backdrop = document.createElement("div");
  backdrop.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;";
  backdrop.addEventListener("click", () => props.onClose());

  const dropdown = document.createElement("div");
  dropdown.style.cssText = buildDropdownCss(rect, theme);

  props.options.forEach((opt) => {
    const isDisabled = props.disabledOptions?.includes(opt.label) ?? false;
    dropdown.appendChild(buildOptionRow(opt.label, isDisabled, () => props.onSelect(opt.label)));
  });

  container.style.pointerEvents = "auto";
  container.appendChild(backdrop);
  container.appendChild(dropdown);

  return () => {
    container.style.pointerEvents = "none";
    container.removeChild(backdrop);
    container.removeChild(dropdown);
  };
}

export function SelectFieldDropdown(props: SelectFieldDropdownProps) {
  const { isVisible, anchorRef } = props;
  const theme = useTheme();
  const rect = useMeasureAnchor(anchorRef, isVisible);
  const portalRef = usePortalContainer();
  const cleanupRef = useRef<(() => void) | null>(null);

  const stableProps = useCallback(() => props, [isVisible, props.options, props.disabledOptions, props.onSelect, props.onClose]);

  useEffect(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!isVisible || !rect || !portalRef.current) return;
    cleanupRef.current = renderPortalContent({ container: portalRef.current, rect, props: stableProps(), theme });
    return () => { cleanupRef.current?.(); cleanupRef.current = null; };
  }, [isVisible, rect, theme, portalRef, stableProps]);

  return null;
}
