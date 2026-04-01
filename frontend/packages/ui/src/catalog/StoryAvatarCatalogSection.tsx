import { View } from "react-native";
import { Text } from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import { StoryAvatar } from "../components/StoryAvatar";
import { PlusIconButton } from "../components/PlusIconButton";
import { CatalogSection } from "./CatalogSection";

const SAMPLE_IMAGE = "https://i.pravatar.cc/200?img=3";

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

function AddStoryState() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const buttonSize = 24;
  return (
    <SubSection label="Add story (lightblueLightgreen + plus badge)">
      <View style={{ paddingBottom: scale(buttonSize / 2) }}>
        <StoryAvatar
          size={65}
          imageUrl={SAMPLE_IMAGE}
          gradientName="lightblueLightgreen"
          badge={
            <View style={{ position: "absolute", bottom: scale(-buttonSize / 2), alignSelf: "center", width: "100%", alignItems: "center" }}>
              <PlusIconButton size={buttonSize} onPress={noop} />
            </View>
          }
        />
      </View>
    </SubSection>
  );
}

function UnviewedStoryState() {
  return (
    <SubSection label="Unviewed story (orangeRed gradient)">
      <StoryAvatar size={65} imageUrl={SAMPLE_IMAGE} gradientName="orangeRed" />
    </SubSection>
  );
}

function ViewedStoryState() {
  return (
    <SubSection label="Viewed story (solid sheetLine ring)">
      <StoryAvatar size={65} imageUrl={SAMPLE_IMAGE} isViewed />
    </SubSection>
  );
}

function AllGradients() {
  return (
    <SubSection label="All gradient variants">
      <StoryAvatar size={65} imageUrl={SAMPLE_IMAGE} gradientName="orangeRed" />
      <StoryAvatar size={65} imageUrl={SAMPLE_IMAGE} gradientName="greenBlue" />
      <StoryAvatar size={65} imageUrl={SAMPLE_IMAGE} gradientName="lightblueLightgreen" />
      <StoryAvatar size={65} imageUrl={SAMPLE_IMAGE} gradientName="bluePink" />
    </SubSection>
  );
}

export function StoryAvatarCatalogSection() {
  return (
    <CatalogSection title="Story Avatars">
      <AddStoryState />
      <UnviewedStoryState />
      <ViewedStoryState />
      <AllGradients />
    </CatalogSection>
  );
}
