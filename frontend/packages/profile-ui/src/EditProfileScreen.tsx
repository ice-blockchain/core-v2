import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvatarPicker, Button, DismissKeyboardView, Icon, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAppNavigation } from "@ion/navigation";
import { EditProfileForm } from "./EditProfileForm";
import type { EditProfileFormValues } from "./edit-profile-types";
import { MOCK_PROFILE } from "./profile-mock-data";
import { PROFILE_NAMESPACE } from "./translations";
import { buildContainerStyle, buildScrollContentStyle, buildAvatarStyle, buildFormStyle, buildFooterStyle, buildBackButtonStyle } from "./edit-profile-styles";

const NS = PROFILE_NAMESPACE;

function buildInitialValues(): EditProfileFormValues {
  return {
    name: MOCK_PROFILE.displayName,
    nickname: MOCK_PROFILE.username,
    bio: MOCK_PROFILE.bio ?? "",
    category: MOCK_PROFILE.category ?? null,
    location: MOCK_PROFILE.location ?? "",
    website: MOCK_PROFILE.website ?? "",
  };
}

function useEditProfileForm() {
  const [values, setValues] = useState(buildInitialValues);

  const handleChangeField = useCallback(
    <K extends keyof EditProfileFormValues>(field: K, value: EditProfileFormValues[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  return { values, handleChangeField };
}

function useScreenStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();

  return {
    container: useMemo(() => buildContainerStyle(theme.colors), [theme.colors]),
    scrollContent: useMemo(() => buildScrollContentStyle(scale), [scale]),
    avatar: useMemo(() => buildAvatarStyle(scale, insets.top), [scale, insets.top]),
    form: useMemo(() => buildFormStyle(scale), [scale]),
    backButton: useMemo(() => buildBackButtonStyle(scale, insets.top), [scale, insets.top]),
    footer: useMemo(() => buildFooterStyle({ scale, bottomInset: insets.bottom, colors: theme.colors }), [scale, insets.bottom, theme.colors]),
  };
}

function EditProfileBackButton({ onBack, style }: { onBack: () => void; style: object }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return (
    <View style={style} pointerEvents="box-none">
      <Pressable onPress={onBack} hitSlop={8}>
        <Icon name="back-arrow" size={scale(24)} color={theme.colors.primaryText} />
      </Pressable>
    </View>
  );
}

function EditProfileFooter({ onSave, style }: { onSave: () => void; style: object }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const saveIcon = useMemo(
    () => <Icon name="profile-save" size={scale(24)} color={theme.colors.onPrimaryAccent} />,
    [scale, theme.colors],
  );

  return (
    <View style={style}>
      <Button label={translate(`${NS}:editProfileSave`)} icon={saveIcon} iconPosition="left" height={56} onPress={onSave} />
    </View>
  );
}

function EditProfileContent({ styles, scale, handlePickAvatar, values, handleChangeField }: {
  styles: ReturnType<typeof useScreenStyles>;
  scale: (n: number) => number;
  handlePickAvatar: () => void;
  values: EditProfileFormValues;
  handleChangeField: <K extends keyof EditProfileFormValues>(field: K, value: EditProfileFormValues[K]) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.avatar}>
        <AvatarPicker
          size={scale(65)}
          borderRadius={scale(16)}
          cameraButtonSize={scale(36)}
          {...(MOCK_PROFILE.avatarUrl ? { currentImageUrl: MOCK_PROFILE.avatarUrl } : {})}
          onPickRequested={handlePickAvatar}
        />
      </View>
      <EditProfileForm values={values} onChangeField={handleChangeField} style={styles.form} />
    </ScrollView>
  );
}

export function EditProfileScreen() {
  const navigation = useAppNavigation();
  const { values, handleChangeField } = useEditProfileForm();
  const styles = useScreenStyles();
  const scale = useTheme().scale.scaleSize;
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleSave = useCallback(() => { console.debug("[EditProfile] save", values); navigation.goBack(); }, [values, navigation]);
  const handlePickAvatar = useCallback(() => { console.debug("[EditProfile] pick avatar"); }, []);

  return (
    <DismissKeyboardView style={styles.container}>
      <EditProfileContent styles={styles} scale={scale} handlePickAvatar={handlePickAvatar} values={values} handleChangeField={handleChangeField} />
      <EditProfileBackButton onBack={handleBack} style={styles.backButton} />
      <EditProfileFooter onSave={handleSave} style={styles.footer} />
    </DismissKeyboardView>
  );
}
