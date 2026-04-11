import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Icon, TextField, SelectField, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import type { EditProfileFormValues } from "./edit-profile-types";
import { PROFILE_NAMESPACE } from "./translations";

const NS = PROFILE_NAMESPACE;

const CATEGORY_OPTIONS = ["Creator", "Artist", "Developer", "Musician", "Writer", "Educator", "Other"];

interface EditProfileFormProps {
  values: EditProfileFormValues;
  onChangeField: <K extends keyof EditProfileFormValues>(field: K, value: EditProfileFormValues[K]) => void;
  style?: StyleProp<ViewStyle>;
}

function useFieldIcons() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const color = theme.colors.tertiaryText;
  const size = scale(24);

  return useMemo(() => ({
    name: <Icon name="field-name" size={size} color={color} />,
    nickname: <Icon name="field-nickname" size={size} color={color} />,
    bio: <Icon name="articles" size={size} color={color} />,
    location: <Icon name="profile-location" size={size} color={color} />,
    website: <Icon name="article-link" size={size} color={color} />,
  }), [size, color]);
}

function TextFields({ values, onChangeField, icons }: EditProfileFormProps & { icons: ReturnType<typeof useFieldIcons> }) {
  return (
    <>
      <TextField label={translate(`${NS}:editProfileName`)} value={values.name}
        onChangeText={(text) => onChangeField("name", text)}
        prefixIcon={icons.name} hasPrefixDivider textInputProps={{ maxLength: 50 }} />
      <TextField label={translate(`${NS}:editProfileNickname`)} value={values.nickname}
        onChangeText={(text) => onChangeField("nickname", text)}
        prefixIcon={icons.nickname} hasPrefixDivider textInputProps={{ autoCapitalize: "none", maxLength: 20 }} />
      <TextField label={translate(`${NS}:editProfileBio`)} value={values.bio}
        onChangeText={(text) => onChangeField("bio", text)}
        prefixIcon={icons.bio} hasPrefixDivider minLines={1} maxLines={4} textInputProps={{ maxLength: 150 }} />
    </>
  );
}

function DetailFields({ values, onChangeField, icons }: EditProfileFormProps & { icons: ReturnType<typeof useFieldIcons> }) {
  return (
    <>
      <SelectField
        label={translate(`${NS}:editProfileSelectCategory`)}
        value={values.category}
        options={CATEGORY_OPTIONS}
        onSelect={(selected) => onChangeField("category", selected)}
      />
      <TextField
        label={translate(`${NS}:editProfileLocation`)}
        value={values.location}
        onChangeText={(text) => onChangeField("location", text)}
        prefixIcon={icons.location}
        hasPrefixDivider
        textInputProps={{ maxLength: 100 }}
      />
      <TextField
        label={translate(`${NS}:editProfileWebsite`)}
        value={values.website}
        onChangeText={(text) => onChangeField("website", text)}
        prefixIcon={icons.website}
        hasPrefixDivider
        textInputProps={{ autoCapitalize: "none", keyboardType: "url" }}
      />
    </>
  );
}

export function EditProfileForm({ values, onChangeField, style }: EditProfileFormProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const icons = useFieldIcons();
  const gapStyle = useMemo(() => ({ gap: scale(19) }), [scale]);

  return (
    <View style={[gapStyle, style]}>
      <TextFields values={values} onChangeField={onChangeField} icons={icons} />
      <DetailFields values={values} onChangeField={onChangeField} icons={icons} />
    </View>
  );
}
