// src/components/ui/Card.tsx
import React from "react";
import styled from "styled-components/native";
import type { AppTheme } from "../../theme";
import { Text } from "./Text";

interface CardProps {
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

export const Card: React.FC<CardProps> = ({ children, title }) => {
  // Hilfsfunktion: String-Children in <Text> wrappen
  const renderChildren = (children: React.ReactNode) => {
    if (
      children === null ||
      children === undefined ||
      (typeof children === "string" && children.trim() === "")
    ) {
      return null;
    }
    if (typeof children === "string" || typeof children === "number") {
      return <Text>{children}</Text>;
    }
    if (Array.isArray(children)) {
      return children
        .map((child, idx) => {
          if (
            child === null ||
            child === undefined ||
            (typeof child === "string" && child.trim() === "")
          ) {
            return null;
          }
          return typeof child === "string" || typeof child === "number" ? (
            <Text key={idx}>{child}</Text>
          ) : (
            child
          );
        })
        .filter(Boolean);
    }
    return children;
  };

  return (
    <StyledCard>
      {title && <CardTitle>{title}</CardTitle>}
      <CardContent>{renderChildren(children)}</CardContent>
    </StyledCard>
  );
};
