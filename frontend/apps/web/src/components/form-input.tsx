"use client";

import { type CSSProperties, type ReactNode, useState } from "react";

interface FormInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconPress?: () => void;
  secureTextEntry?: boolean;
  label?: string;
  errorMessage?: string | null;
}

const baseStyle: CSSProperties = {
  width: 287,
  height: 58,
  borderRadius: 16,
  backgroundColor: "#FFFFFF",
  display: "flex",
  alignItems: "center",
  padding: "0 16px",
};

const sepStyle: CSSProperties = {
  width: 1,
  height: 26,
  backgroundColor: "#CCCCCC",
  margin: "0 16px",
  flexShrink: 0,
};

const inputStyle: CSSProperties = {
  flex: 1,
  border: "none",
  outline: "none",
  fontWeight: 600,
  fontSize: 13,
  lineHeight: "18px",
  color: "#0E0E0E",
  backgroundColor: "transparent",
  padding: 0,
};

const labelStyle: CSSProperties = {
  fontWeight: 500,
  fontSize: 12,
  color: "#0166FF",
  marginBottom: 2,
};

const errorLabelStyle: CSSProperties = {
  fontWeight: 500,
  fontSize: 12,
  color: "#FD4E4E",
  marginBottom: 2,
};

const btnStyle: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  marginLeft: 8,
  flexShrink: 0,
};

function LeftSection({ icon }: { icon: ReactNode }) {
  return (
    <>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={sepStyle} />
    </>
  );
}

function RightAction({ icon, onPress }: { icon: ReactNode; onPress?: (() => void) | undefined }) {
  return (
    <button type="button" onClick={onPress} style={btnStyle}>
      {icon}
    </button>
  );
}

export function FormInput(props: FormInputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(props.errorMessage);
  const showLabel = focused || props.value.length > 0 || hasError;
  const borderColor = hasError ? "#FD4E4E" : focused ? "#0166FF" : "#CCCCCC";

  const labelText = hasError ? props.errorMessage : (props.label ?? props.placeholder);
  const currentLabelStyle = hasError ? errorLabelStyle : labelStyle;

  return (
    <div style={{ ...baseStyle, border: `1px solid ${borderColor}` }}>
      {props.leftIcon && <LeftSection icon={props.leftIcon} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {showLabel && <span style={currentLabelStyle}>{labelText}</span>}
        <input
          type={props.secureTextEntry ? "password" : "text"}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={showLabel ? "" : props.placeholder}
          style={inputStyle}
        />
      </div>
      {props.rightIcon && <RightAction icon={props.rightIcon} onPress={props.onRightIconPress} />}
    </div>
  );
}
