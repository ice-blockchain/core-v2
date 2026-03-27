import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { TextInput } from "@ion/ui";
import { translate } from "@ion/localization";
import type { ProfileFormState, ProfileFormActions } from "./profile-setup-hooks";

interface ProfileSetupFieldsProps {
  formState: ProfileFormState;
  formActions: ProfileFormActions;
  style: StyleProp<ViewStyle>;
}

function NameField({ formState, formActions }: Pick<ProfileSetupFieldsProps, "formState" | "formActions">) {
  const err = formState.name.errorMessage;
  return (
    <TextInput value={formState.name.value} onChangeText={formActions.setName} placeholder={translate("onboarding:namePlaceholder")}
      prefixIcon="field-name" state={formState.name.inputState} {...(err ? { errorMessage: err } : {})} maxLength={50} testID="name-input" />
  );
}

function NicknameField({ formState, formActions }: Pick<ProfileSetupFieldsProps, "formState" | "formActions">) {
  const err = formState.nickname.errorMessage;
  return (
    <TextInput value={formState.nickname.value} onChangeText={formActions.setNickname} placeholder={translate("onboarding:nicknamePlaceholder")}
      prefixIcon="field-nickname" state={formState.nickname.inputState} {...(err ? { errorMessage: err } : {})}
      maxLength={20} autoCapitalize="none" testID="nickname-input" />
  );
}

function ReferralField({ formState, formActions }: Pick<ProfileSetupFieldsProps, "formState" | "formActions">) {
  const err = formState.referral.errorMessage;
  return (
    <TextInput value={formState.referral.value} onChangeText={formActions.setReferral} placeholder={translate("onboarding:referralPlaceholder")}
      prefixIcon="field-inviter" state={formState.referral.inputState} {...(err ? { errorMessage: err } : {})}
      maxLength={20} autoCapitalize="none" onFocus={formActions.checkClipboardReferral} testID="referral-input" />
  );
}

export function ProfileSetupFields({ formState, formActions, style }: ProfileSetupFieldsProps) {
  return (
    <View style={style}>
      <NameField formState={formState} formActions={formActions} />
      <NicknameField formState={formState} formActions={formActions} />
      <ReferralField formState={formState} formActions={formActions} />
    </View>
  );
}
