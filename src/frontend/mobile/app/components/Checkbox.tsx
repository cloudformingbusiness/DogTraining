// src/components/ui/Checkbox.tsx
import React from 'react';
import styled from 'styled-components/native';
import type { AppTheme } from '../../theme';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

const CheckboxContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.xs}px;
`;

const CheckboxBox = styled.View<{ theme: AppTheme; checked: boolean }>`
  width: 24px;
  height: 24px;
  border: 2px solid ${({ theme, checked }) => 
    checked ? theme.colors.primary : theme.colors.border
  };
  border-radius: ${({ theme }) => theme.radius.sm}px;
  background-color: ${({ theme, checked }) => 
    checked ? theme.colors.primary : 'transparent'
  };
  justify-content: center;
  align-items: center;
  margin-right: ${({ theme }) => theme.spacing.sm}px;
`;

const CheckboxIcon = styled.Text`
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const CheckboxLabel = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.body}px;
  flex: 1;
`;

export const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onToggle }) => {
  return (
    <CheckboxContainer onPress={onToggle}>
      <CheckboxBox checked={checked}>
        {checked && <CheckboxIcon>✓</CheckboxIcon>}
      </CheckboxBox>
      <CheckboxLabel>{label}</CheckboxLabel>
    </CheckboxContainer>
  );
};