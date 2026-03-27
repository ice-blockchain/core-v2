import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { BottomSheet, Button, Icon, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { saveProfile } from "@ion/onboarding";
import type { OnboardingScreenProps } from "../types";
import { AvatarPicker } from "../components/AvatarPicker";
import { NicknameReservedModal } from "../components/NicknameReservedModal";
import { useProfileForm } from "./profile-setup-hooks";
import { AuthHeader } from "./AuthHeader";
import { ProfileSetupFields } from "./ProfileSetupFields";
import { buildAvatarSectionStyle, buildContentContainerStyle, buildFieldsContainerStyle } from "./profile-setup-styles";

function useSaveHandler(formState: ReturnType<typeof useProfileForm>[0], formActions: ReturnType<typeof useProfileForm>[1], onContinue: () => void) {
  return useCallback(async () => {
    if (!formState.isFormValid) return;
    formActions.setSubmitting(true);
    try {
      await saveProfile({ displayName: formState.name.value, nickname: formState.nickname.value, ...(formState.referral.value ? { referredBy: formState.referral.value } : {}) });
      onContinue();
    } catch {
      formActions.setSubmitting(false);
    }
  }, [formState, formActions, onContinue]);
}

export function ProfileSetupScreen({ onContinue, onBack }: OnboardingScreenProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const [formState, formActions] = useProfileForm();
  const handleSave = useSaveHandler(formState, formActions, onContinue);

  const contentStyle = useMemo(() => buildContentContainerStyle(scale), [scale]);
  const avatarStyle = useMemo(() => buildAvatarSectionStyle(scale), [scale]);
  const fieldsStyle = useMemo(() => buildFieldsContainerStyle(scale), [scale]);
  const handleClose = useCallback(() => { onBack?.(); }, [onBack]);

  const saveButton = (
    <Button label={translate("onboarding:saveButton")} icon={<Icon name="profile-save" size={scale(24)} color={theme.colors.onPrimaryAccent} />} iconPosition="left" height={56} isDisabled={!formState.isFormValid} isLoading={formState.isSubmitting} onPress={handleSave} />
  );

  return (
    <>
      <BottomSheet isVisible onClose={handleClose} title={translate("onboarding:yourProfileTitle")} {...(onBack ? { onBack } : {})} bottomButton={saveButton} testID="profile-setup-screen">
        <View style={contentStyle}>
          <AuthHeader />
          <View style={avatarStyle}>
            <AvatarPicker isLoading={formState.isAvatarLoading} onPress={() => {}} testID="avatar-picker" />
          </View>
          <ProfileSetupFields formState={formState} formActions={formActions} style={fieldsStyle} />
        </View>
      </BottomSheet>
      <NicknameReservedModal isVisible={formState.isNicknameReserved} onClose={formActions.dismissReservedModal} />
    </>
  );
}
