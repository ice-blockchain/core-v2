import { View } from "react-native";
import { Text } from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import { Avatar } from "../components/Avatar";
import { AvatarPicker } from "../components/AvatarPicker";
import { PlusIconButton } from "../components/PlusIconButton";
import { CatalogSection } from "./CatalogSection";

const SAMPLE_IMAGE = "https://i.pravatar.cc/200?img=3";
const BROKEN_IMAGE = "https://broken.invalid/avatar.png";
const AVATAR_SIZES = [30, 48, 64, 100];

function noop() {}

function SubSection({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.xl }}>
      <Text variant="caption2" color={theme.colors.tertiaryText} style={{ marginBottom: theme.spacing.sm }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        {children}
      </View>
    </View>
  );
}

function AvatarSizes() {
  return (
    <SubSection label="Sizes with image">
      {AVATAR_SIZES.map((s) => (
        <Avatar key={s} size={s} imageUrl={SAMPLE_IMAGE} />
      ))}
    </SubSection>
  );
}

function AvatarFallbacks() {
  return (
    <SubSection label="Fallback (no image)">
      {AVATAR_SIZES.map((s) => (
        <Avatar key={s} size={s} />
      ))}
    </SubSection>
  );
}

function AvatarCustomFallback() {
  const theme = useTheme();
  return (
    <SubSection label="Custom fallback (initials)">
      <Avatar
        size={64}
        fallback={<Text variant="headline2" color={theme.colors.onPrimaryAccent}>JD</Text>}
      />
    </SubSection>
  );
}

function AvatarWithPlusButton() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const avatarSize = 59;
  const buttonSize = 24;
  return (
    <SubSection label="With plus button (add story)">
      <View style={{ alignItems: "center", paddingBottom: scale(buttonSize / 2) }}>
        <View>
          <Avatar size={avatarSize} imageUrl={SAMPLE_IMAGE} />
          <View style={{ position: "absolute", bottom: scale(-buttonSize / 2), alignSelf: "center", width: "100%", alignItems: "center" }}>
            <PlusIconButton size={buttonSize} onPress={noop} />
          </View>
        </View>
      </View>
    </SubSection>
  );
}

function AvatarErrorState() {
  return (
    <SubSection label="Image error (shows fallback)">
      <Avatar size={64} imageUrl={BROKEN_IMAGE} />
    </SubSection>
  );
}

function PickerStates() {
  return (
    <SubSection label="AvatarPicker states">
      <View style={{ alignItems: "center" }}>
        <AvatarPicker onPickRequested={noop} />
        <Text variant="caption3">Empty</Text>
      </View>
      <View style={{ alignItems: "center" }}>
        <AvatarPicker onPickRequested={noop} currentImageUrl={SAMPLE_IMAGE} />
        <Text variant="caption3">With image</Text>
      </View>
      <View style={{ alignItems: "center" }}>
        <AvatarPicker onPickRequested={noop} currentImageUrl={SAMPLE_IMAGE} isProcessing />
        <Text variant="caption3">Processing</Text>
      </View>
    </SubSection>
  );
}

export function AvatarCatalogSection() {
  return (
    <CatalogSection title="Avatars">
      <AvatarSizes />
      <AvatarFallbacks />
      <AvatarCustomFallback />
      <AvatarWithPlusButton />
      <AvatarErrorState />
      <PickerStates />
    </CatalogSection>
  );
}
