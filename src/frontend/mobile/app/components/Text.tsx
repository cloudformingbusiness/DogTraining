// src/components/ui/Text.tsx
import styled from "styled-components/native";
import type { AppTheme } from "../themes";

type TextVariant = "h1" | "h2" | "body" | "small";

interface TextProps {
  variant?: TextVariant;
  color?: keyof AppTheme["colors"];
}

export const Text = styled.Text<{
  theme: AppTheme;
  variant?: TextVariant;
  color?: string;
}>`
  color: ${({ theme, color }) =>
    color
      ? theme.colors[color as keyof typeof theme.colors]
      : theme.colors.text};
  font-size: ${({ theme, variant = "body" }) => theme.typography[variant]}px;
  font-weight: ${({ variant }) =>
    variant === "h1" || variant === "h2" ? "700" : "400"};
`;

export const CardText = styled(Text)`
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;
