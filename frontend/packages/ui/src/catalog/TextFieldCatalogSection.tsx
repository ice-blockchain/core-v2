import { useState } from "react";
import { View } from "react-native";
import { Text } from "../components/Text";
import { TextField } from "../components/TextField";
import { Icon } from "../icons/Icon";
import { useTheme } from "../theme/ThemeProvider";
import { CatalogSection } from "./CatalogSection";

function DemoRow({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text variant="caption2" color={theme.colors.tertiaryText} style={{ marginBottom: theme.spacing.xs }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function DefaultDemo() {
  const [value, setValue] = useState("");
  return (
    <DemoRow label="Default (empty)">
      <TextField label="Name" value={value} onChangeText={setValue} />
    </DemoRow>
  );
}

function FilledDemo() {
  const [value, setValue] = useState("Jason Glover");
  return (
    <DemoRow label="Filled">
      <TextField label="Name" value={value} onChangeText={setValue} />
    </DemoRow>
  );
}

function ErrorDemo() {
  const [value, setValue] = useState("350.00");
  return (
    <DemoRow label="Error">
      <TextField label="USDT amount" value={value} onChangeText={setValue} state="error" errorMessage="Invalid characters" />
    </DemoRow>
  );
}

function VerifiedDemo() {
  const [value, setValue] = useState("@jasonglover");
  return (
    <DemoRow label="Verified">
      <TextField
        label="Nickname"
        value={value}
        onChangeText={setValue}
        state="verified"
        suffixIcon={<Icon name="checkbox_on" size={24} color="#35D487" />}
      />
    </DemoRow>
  );
}

function DisabledDemo() {
  return (
    <DemoRow label="Disabled">
      <TextField label="USDT amount" value="350.00" state="disabled" />
    </DemoRow>
  );
}

function PrefixIconDemo() {
  const theme = useTheme();
  const [value, setValue] = useState("");
  return (
    <DemoRow label="Prefix icon + divider">
      <TextField
        label="Name"
        value={value}
        onChangeText={setValue}
        prefixIcon={<Icon name="manage" size={20} color={theme.colors.tertiaryText} />}
        hasPrefixDivider
      />
    </DemoRow>
  );
}

function SuffixIconDemo() {
  const theme = useTheme();
  const [value, setValue] = useState("David Guetta");
  return (
    <DemoRow label="Suffix icon">
      <TextField
        label="Name"
        value={value}
        onChangeText={setValue}
        suffixIcon={<Icon name="send" size={20} color={theme.colors.tertiaryText} />}
      />
    </DemoRow>
  );
}

function ClearableDemo() {
  const [value, setValue] = useState("350.00");
  return (
    <DemoRow label="Clearable">
      <TextField label="USDT amount" value={value} onChangeText={setValue} isClearable />
    </DemoRow>
  );
}

function UncontrolledDemo() {
  return (
    <DemoRow label="Uncontrolled (defaultValue)">
      <TextField label="Name" defaultValue="Jason Glover" />
    </DemoRow>
  );
}

function SecureDemo() {
  const [value, setValue] = useState("12345qwerty");
  return (
    <DemoRow label="Secure text entry">
      <TextField label="Password" value={value} onChangeText={setValue} isSecureTextEntry />
    </DemoRow>
  );
}

function MultilineDemo() {
  const [value, setValue] = useState("");
  return (
    <DemoRow label="Multiline (maxLines=4)">
      <TextField label="Description" value={value} onChangeText={setValue} maxLines={4} />
    </DemoRow>
  );
}

function MinLinesDemo() {
  const [value, setValue] = useState("");
  return (
    <DemoRow label="Multiline (minLines=3, maxLines=6)">
      <TextField label="Bio" value={value} onChangeText={setValue} minLines={3} maxLines={6} />
    </DemoRow>
  );
}

export function TextFieldCatalogSection() {
  return (
    <CatalogSection title="Text Fields">
      <DefaultDemo />
      <FilledDemo />
      <ErrorDemo />
      <VerifiedDemo />
      <DisabledDemo />
      <PrefixIconDemo />
      <SuffixIconDemo />
      <ClearableDemo />
      <UncontrolledDemo />
      <SecureDemo />
      <MultilineDemo />
      <MinLinesDemo />
    </CatalogSection>
  );
}
