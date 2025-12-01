// src/components/ui/Picker.tsx
import React, { useState } from 'react';
import styled from 'styled-components/native';
import type { AppTheme } from '../../theme';

interface PickerOption {
  label: string;
  value: string;
  icon?: string;
}

interface PickerProps {
  options: PickerOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  label?: string;
  placeholder?: string;
  multiSelect?: boolean;
  selectedValues?: string[];
  onMultiSelect?: (values: string[]) => void;
}

const PickerContainer = styled.View`
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
  position: relative;
`;

const PickerLabel = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.body}px;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.xs}px;
`;

const PickerButton = styled.TouchableOpacity<{ theme: AppTheme }>`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.background};
  min-height: 48px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const PickerText = styled.Text<{ theme: AppTheme; isPlaceholder: boolean }>`
  color: ${({ theme, isPlaceholder }) => 
    isPlaceholder ? theme.colors.muted : theme.colors.text
  };
  font-size: ${({ theme }) => theme.typography.body}px;
  flex: 1;
`;

const PickerArrow = styled.Text<{ theme: AppTheme; isOpen: boolean }>`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 16px;
  transform: ${({ isOpen }) => isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const DropdownContainer = styled.ScrollView<{ theme: AppTheme }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: ${({ theme }) => theme.colors.card};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md}px;
  z-index: 1000;
  max-height: 250px;
  elevation: 5;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.25;
  shadow-radius: 3.84px;
`;

const DropdownOption = styled.TouchableOpacity<{ theme: AppTheme; isSelected: boolean }>`
  padding: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme, isSelected }) => 
    isSelected ? theme.colors.primary : 'transparent'
  };
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-direction: row;
  align-items: center;
`;

const OptionIcon = styled.Text`
  font-size: 18px;
  margin-right: ${({ theme }) => theme.spacing.sm}px;
`;

const DropdownOptionText = styled.Text<{ theme: AppTheme; isSelected: boolean }>`
  color: ${({ theme, isSelected }) => 
    isSelected ? '#FFFFFF' : theme.colors.text
  };
  font-size: ${({ theme }) => theme.typography.body}px;
  flex: 1;
`;

const CheckIcon = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 18px;
  font-weight: bold;
`;

const SelectedTagsContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing.xs}px;
`;

const SelectedTag = styled.View<{ theme: AppTheme }>`
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radius.pill}px;
  padding: ${({ theme }) => theme.spacing.xs}px ${({ theme }) => theme.spacing.sm}px;
  margin: 2px;
  flex-direction: row;
  align-items: center;
`;

const TagText = styled.Text`
  color: white;
  font-size: ${({ theme }) => theme.typography.small}px;
  margin-right: 4px;
`;

const RemoveTagButton = styled.TouchableOpacity`
  width: 16px;
  height: 16px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  justify-content: center;
  align-items: center;
`;

const RemoveTagText = styled.Text`
  color: white;
  font-size: 12px;
  font-weight: bold;
`;

export const Picker: React.FC<PickerProps> = ({ 
  options, 
  selectedValue, 
  onSelect, 
  label,
  placeholder = "Auswahl treffen...",
  multiSelect = false,
  selectedValues = [],
  onMultiSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(option => option.value === selectedValue);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (value: string) => {
    if (multiSelect && onMultiSelect) {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value];
      onMultiSelect(newValues);
    } else {
      onSelect(value);
      setIsOpen(false);
    }
  };

  const removeTag = (valueToRemove: string) => {
    if (onMultiSelect) {
      onMultiSelect(selectedValues.filter(v => v !== valueToRemove));
    }
  };

  const getDisplayText = () => {
    if (multiSelect) {
      return selectedValues.length > 0 
        ? `${selectedValues.length} Auswahl(en) getroffen`
        : placeholder;
    }
    return displayText;
  };

  return (
    <PickerContainer>
      {label && <PickerLabel>{label}</PickerLabel>}
      <PickerButton onPress={() => setIsOpen(!isOpen)}>
        <PickerText isPlaceholder={multiSelect ? selectedValues.length === 0 : !selectedOption}>
          {getDisplayText()}
        </PickerText>
        <PickerArrow isOpen={isOpen}>▼</PickerArrow>
      </PickerButton>
      
      {multiSelect && selectedValues.length > 0 && (
        <SelectedTagsContainer>
          {selectedValues.map((value) => {
            const option = options.find(opt => opt.value === value);
            return (
              <SelectedTag key={value}>
                <TagText>{option?.label || value}</TagText>
                <RemoveTagButton onPress={() => removeTag(value)}>
                  <RemoveTagText>×</RemoveTagText>
                </RemoveTagButton>
              </SelectedTag>
            );
          })}
        </SelectedTagsContainer>
      )}
      
      {isOpen && (
        <DropdownContainer>
          {options.map((option) => {
            const isSelected = multiSelect 
              ? selectedValues.includes(option.value)
              : selectedValue === option.value;
            
            return (
              <DropdownOption
                key={option.value}
                isSelected={!multiSelect && isSelected}
                onPress={() => handleSelect(option.value)}
              >
                {option.icon && <OptionIcon>{option.icon}</OptionIcon>}
                <DropdownOptionText isSelected={!multiSelect && isSelected}>
                  {option.label}
                </DropdownOptionText>
                {multiSelect && isSelected && <CheckIcon>✓</CheckIcon>}
              </DropdownOption>
            );
          })}
        </DropdownContainer>
      )}
    </PickerContainer>
  );
};