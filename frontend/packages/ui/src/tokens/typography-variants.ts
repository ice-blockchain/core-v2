import type { RawTypographyVariant } from "../theme/theme-types";

const NOTO_SANS_REGULAR = "NotoSans-Regular";
const NOTO_SANS_MEDIUM = "NotoSans-Medium";
const NOTO_SANS_SEMIBOLD = "NotoSans-SemiBold";
const NOTO_SANS_BOLD = "NotoSans-Bold";

const FONT_WEIGHT_FAMILY: Record<string, string> = {
  "400": NOTO_SANS_REGULAR,
  "500": NOTO_SANS_MEDIUM,
  "600": NOTO_SANS_SEMIBOLD,
  "700": NOTO_SANS_BOLD,
};

function fontFamilyForWeight(weight: string): string {
  return FONT_WEIGHT_FAMILY[weight] ?? NOTO_SANS_REGULAR;
}

export const typographyVariants: Record<string, RawTypographyVariant> = {
  headline1: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: undefined,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("700"),
  },
  headline2: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 31,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("700"),
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: undefined,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("600"),
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: undefined,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("600"),
  },
  subtitle2: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: undefined,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("500"),
  },
  subtitle3: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: undefined,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("500"),
  },
  body: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("600"),
  },
  body2: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: undefined,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("400"),
  },
  caption: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: undefined,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("500"),
  },
  caption2: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: undefined,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("400"),
  },
  caption3: {
    fontSize: 11,
    fontWeight: "400",
    lineHeight: 18,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("400"),
  },
  caption4: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("600"),
  },
  caption5: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: undefined,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("500"),
  },
  caption6: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 16,
    letterSpacing: 0.11,
    fontFamily: fontFamilyForWeight("500"),
  },
  notificationCaption: {
    fontSize: 6,
    fontWeight: "700",
    lineHeight: undefined,
    letterSpacing: 0,
    fontFamily: fontFamilyForWeight("700"),
  },
};
