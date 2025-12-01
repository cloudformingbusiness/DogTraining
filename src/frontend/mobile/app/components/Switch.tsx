// src/components/ui/Switch.tsx
import React from "react";
import { Switch as RNSwitch } from "react-native";
import styled from "styled-components/native";
import type { AppTheme } from "../../theme";

interface SwitchProps {
  label?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const SwitchContainer = styled.View<{ theme: AppTheme }>`
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const SwitchRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Label = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.body}px;
  font-weight: 600;
  flex: 1;
  margin-right: ${({ theme }) => theme.spacing.md}px;
`;

export function Switch({
  label,
  value,
  onValueChange,
  disabled = false,
}: SwitchProps) {
  return (
    <SwitchContainer>
      <SwitchRow>
        {label && <Label>{label}</Label>}
        <RNSwitch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: "#ccc", true: "#4CAF50" }}
          thumbColor={value ? "#ffffff" : "#f4f3f4"}
        />
      </SwitchRow>
    </SwitchContainer>
  );
}
