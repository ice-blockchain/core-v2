import { useMemo } from "react";
import { Image, View } from "react-native";
import { Button, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import {
  buildContentStyle,
  buildIllustrationStyle,
  buildTextGroupStyle,
  buildDescriptionStyle,
  buildButtonRowStyle,
  buildButtonStyle,
} from "./delete-chat-sheet-styles";
import { chatDeleteImage } from "./chat-images";

interface DeleteChatSheetContentProps {
  readonly onCancel: () => void;
  readonly onDelete: () => void;
}

export function DeleteChatSheetContent({ onCancel, onDelete }: DeleteChatSheetContentProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const contentStyle = useMemo(() => buildContentStyle(scale), [scale]);
  const illustrationStyle = useMemo(() => buildIllustrationStyle(scale), [scale]);
  const textGroupStyle = useMemo(() => buildTextGroupStyle(scale), [scale]);
  const descriptionStyle = useMemo(() => buildDescriptionStyle(scale), [scale]);
  const buttonRowStyle = useMemo(() => buildButtonRowStyle(scale), [scale]);
  const buttonStyle = useMemo(() => buildButtonStyle(), []);

  return (
    <View style={contentStyle}>
      <Image source={chatDeleteImage} style={illustrationStyle} />
      <View style={textGroupStyle}>
        <Text variant="title">{translate("chat:deleteChatTitle")}</Text>
        <Text variant="body2" color={theme.colors.secondaryText} style={descriptionStyle}>
          {translate("chat:deleteChatSingularMessage")}
        </Text>
      </View>
      <View style={buttonRowStyle}>
        <Button color="tertiary" label={translate("chat:cancelButton")} onPress={onCancel} style={buttonStyle} />
        <Button color="danger" label={translate("chat:deleteAction")} onPress={onDelete} style={buttonStyle} />
      </View>
    </View>
  );
}
