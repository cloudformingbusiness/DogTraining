// src/components/ui/Button.tsx
import React from "react";
import styled from "styled-components/native";
import type { AppTheme } from "../themes";

export type ButtonVariant = "primary" | "secondary" | "danger" | "outline";

interface ButtonProps {
  variant?: ButtonVariant;
  onPress: () => void | Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

const StyledButton = styled.TouchableOpacity<{
  theme: AppTheme;
  variant: ButtonVariant;
  disabled?: boolean;
}>`
  margin-top: ${({ theme }) => theme.spacing.sm}px;
  padding-horizontal: ${({ theme }) =>
    theme.components.button.paddingHorizontal}px;
  padding-vertical: ${({ theme }) => theme.components.button.paddingVertical}px;
  border-radius: ${({ theme }) => theme.components.button.borderRadius}px;
  background-color: ${({ theme, variant, disabled }) =>
    disabled
      ? theme.colors.muted
      : theme.colors.button?.[variant]?.background ?? theme.colors.primary};
  border: 1px solid
    ${({ theme, variant, disabled }) =>
      disabled
        ? theme.colors.muted
        : theme.colors.button?.[variant]?.border ?? theme.colors.primary};
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;

const ButtonText = styled.Text<{
  theme: AppTheme;
  variant: ButtonVariant;
  disabled?: boolean;
}>`
  text-align: center;
  color: ${({ theme, variant, disabled }) =>
    disabled ? "#FFFFFF" : theme.colors.button?.[variant]?.text ?? "#FFFFFF"};
  font-weight: ${({ theme }) => theme.components.button.fontWeight};
  font-size: ${({ theme }) => theme.components.button.fontSize}px;
`;

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  onPress,
  children,
  disabled = false,
}) => {
  return (
    <StyledButton
      variant={variant}
      onPress={disabled ? () => {} : onPress}
      disabled={disabled}
    >
      <ButtonText variant={variant} disabled={disabled}>
        {children}
      </ButtonText>
    </StyledButton>
  );
};
