import type { CSSProperties } from "react";
import { CheckIcon } from "./check-icon";
import { CrossIcon } from "./cross-icon";

interface PasswordRule {
  label: string;
  isMet: boolean;
}

interface PasswordStrengthChecklistProps {
  rules: PasswordRule[];
}

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const labelStyle: CSSProperties = {
  fontWeight: 400,
  fontSize: 12,
  color: "#0E0E0E",
};

export function PasswordStrengthChecklist({
  rules,
}: PasswordStrengthChecklistProps) {
  return (
    <div style={containerStyle}>
      {rules.map((rule) => (
        <div key={rule.label} style={rowStyle}>
          {rule.isMet ? <CheckIcon /> : <CrossIcon />}
          <span style={labelStyle}>{rule.label}</span>
        </div>
      ))}
    </div>
  );
}
