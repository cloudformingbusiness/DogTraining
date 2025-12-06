// src/components/ui/Card.tsx
import React from "react";
import { ViewProps } from "react-native";
import styled from "styled-components/native";
import type { AppTheme } from "../themes";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  title?: string;
}

const StyledCard = styled.View<{ theme: AppTheme }>`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.components.card.borderRadius}px;
  padding: ${({ theme }) => theme.components.card.padding}px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
`;

const CardTitle = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.h2}px;
  font-weight: 600; /* Slightly less bold */
  margin-bottom: ${({ theme }) =>
    theme.spacing.lg}px; /* More space after title */
`;

const CardContent = styled.View``;

export const Card: React.FC<CardProps> = ({ children, title, ...rest }) => {
  return (
    <StyledCard {...rest}>
      {title && <CardTitle>{title}</CardTitle>}
      <CardContent>{children}</CardContent>
    </StyledCard>
  );
};
