// src/components/ui/Select.tsx
import React, { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import styled from 'styled-components/native';
import type { AppTheme } from '../../theme';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  options: SelectOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  label?: string;
  placeholder?: string;
}

const SelectContainer = styled.View`
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const SelectLabel = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.body}px;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.xs}px;
`;

const SelectButton = styled.TouchableOpacity<{ theme: AppTheme }>`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.background};
  min-height: 48px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const SelectText = styled.Text<{ theme: AppTheme; isPlaceholder: boolean }>`
  color: ${({ theme, isPlaceholder }) => 
    isPlaceholder ? theme.colors.muted : theme.colors.text
  };
  font-size: ${({ theme }) => theme.typography.body}px;
  flex: 1;
`;

const SelectArrow = styled.Text<{ theme: AppTheme; isOpen: boolean }>`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 16px;
  transform: ${({ isOpen }) => isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

// Modal Overlay für bessere Sichtbarkeit
const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const DropdownContainer = styled.View<{ theme: AppTheme }>`
  background-color: #FFFFFF;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  max-height: 400px;
  width: 100%;
  max-width: 350px;
  elevation: 10;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 5px;
`;

const DropdownHeader = styled.View<{ theme: AppTheme }>`
  padding: ${({ theme }) => theme.spacing.lg}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background-color: #F8F9FA;
  border-top-left-radius: ${({ theme }) => theme.radius.lg}px;
  border-top-right-radius: ${({ theme }) => theme.radius.lg}px;
`;

const DropdownTitle = styled.Text<{ theme: AppTheme }>`
  color: #333333;
  font-size: ${({ theme }) => theme.typography.h2}px;
  font-weight: 600;
  text-align: center;
`;

const CloseButton = styled.TouchableOpacity<{ theme: AppTheme }>`
  position: absolute;
  right: ${({ theme }) => theme.spacing.md}px;
  top: ${({ theme }) => theme.spacing.md}px;
  padding: ${({ theme }) => theme.spacing.xs}px;
`;

const CloseButtonText = styled.Text`
  color: #666666;
  font-size: 18px;
  font-weight: 600;
`;

const DropdownScrollContainer = styled(ScrollView)`
  max-height: 300px;
`;

const DropdownOption = styled.TouchableOpacity<{ theme: AppTheme; isSelected: boolean }>`
  padding: ${({ theme }) => theme.spacing.lg}px;
  background-color: ${({ theme, isSelected }) => 
    isSelected ? theme.colors.primary : '#FFFFFF'
  };
  border-bottom: 1px solid #E9ECEF;
`;

const DropdownOptionText = styled.Text<{ theme: AppTheme; isSelected: boolean }>`
  color: ${({ theme, isSelected }) => 
    isSelected ? '#FFFFFF' : '#333333'
  };
  font-size: ${({ theme }) => theme.typography.body}px;
  font-weight: ${({ isSelected }) => isSelected ? '600' : '400'};
`;

export const Select: React.FC<SelectProps> = ({ 
  options, 
  selectedValue, 
  onSelect, 
  label,
  placeholder = "Auswahl treffen..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(option => option.value === selectedValue);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (value: string) => {
    onSelect(value);
    setIsOpen(false);
  };

  return (
    <SelectContainer>
      {label && <SelectLabel>{label}</SelectLabel>}
      <SelectButton onPress={() => setIsOpen(!isOpen)}>
        <SelectText isPlaceholder={!selectedOption}>
          {displayText}
        </SelectText>
        <SelectArrow isOpen={isOpen}>▼</SelectArrow>
      </SelectButton>
      
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <ModalOverlay>
          <DropdownContainer>
            <DropdownHeader>
              <DropdownTitle>
                {label || "Auswahl treffen"}
              </DropdownTitle>
              <CloseButton onPress={() => setIsOpen(false)}>
                <CloseButtonText>✕</CloseButtonText>
              </CloseButton>
            </DropdownHeader>
            
            <DropdownScrollContainer showsVerticalScrollIndicator={false}>
              {options.map((option) => (
                <DropdownOption
                  key={option.value}
                  isSelected={selectedValue === option.value}
                  onPress={() => handleSelect(option.value)}
                >
                  <DropdownOptionText isSelected={selectedValue === option.value}>
                    {option.label}
                  </DropdownOptionText>
                </DropdownOption>
              ))}
            </DropdownScrollContainer>
          </DropdownContainer>
        </ModalOverlay>
      </Modal>
    </SelectContainer>
  );
};