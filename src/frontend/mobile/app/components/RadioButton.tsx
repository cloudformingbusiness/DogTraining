// src/components/ui/RadioButton.tsx
import React from 'react';
import styled from 'styled-components/native';
import type { AppTheme } from '../../theme';

interface RadioOption {
  label: string;
  value: string;
}

interface RadioButtonProps {
  options: RadioOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  label?: string;
}

const RadioContainer = styled.View`
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const RadioLabel = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.body}px;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

const RadioOptionContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.xs}px;
`;

const RadioCircle = styled.View<{ theme: AppTheme; selected: boolean }>`
  width: 24px;
  height: 24px;
  border: 2px solid ${({ theme, selected }) => 
    selected ? theme.colors.primary : theme.colors.border
  };
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  margin-right: ${({ theme }) => theme.spacing.sm}px;
`;

const RadioInnerCircle = styled.View<{ theme: AppTheme }>`
  width: 12px;
  height: 12px;
  border-radius: 6px;
  background-color: ${({ theme }) => theme.colors.primary};
`;

const RadioOptionLabel = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.body}px;
  flex: 1;
`;

export const RadioButton: React.FC<RadioButtonProps> = ({ 
  options, 
  selectedValue, 
  onSelect, 
  label 
}) => {
  return (
    <RadioContainer>
      {label && <RadioLabel>{label}</RadioLabel>}
      {options.map((option) => (
        <RadioOptionContainer
          key={option.value}
          onPress={() => onSelect(option.value)}
        >
          <RadioCircle selected={selectedValue === option.value}>
            {selectedValue === option.value && <RadioInnerCircle />}
          </RadioCircle>
          <RadioOptionLabel>{option.label}</RadioOptionLabel>
        </RadioOptionContainer>
      ))}
    </RadioContainer>
  );
};