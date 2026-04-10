export interface RichTextFormatState {
  readonly isBold: boolean;
  readonly isItalic: boolean;
}

export interface RichTextActions {
  readonly toggleBold: () => void;
  readonly toggleItalic: () => void;
  readonly getHTML: () => Promise<string>;
  readonly focus: () => void;
}
