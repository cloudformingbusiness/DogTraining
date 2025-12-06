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
  margin-top: ${({ theme }) => theme.spacing.lg}px;
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.components.card.borderRadius}px;
  padding: ${({ theme }) => theme.components.card.padding}px;
  border: ${({ theme }) => theme.components.card.borderWidth}px solid
    ${({ theme }) => theme.colors.border};
`;

const CardTitle = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.h2}px;
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
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
