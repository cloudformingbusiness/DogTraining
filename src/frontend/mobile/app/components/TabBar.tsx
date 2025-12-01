// src/components/ui/TabBar.tsx
import React from "react";
import { ScrollView } from "react-native";
import styled from "styled-components/native";
import type { AppTheme } from "../../theme";

type TabKey =
  | "dashboard"
  | "messdaten"
  | "projekt"
  | "fotodokumentation"
  | "sicherheit"
  | "kalkulation"
  | "settings"
  | "entwicklung";

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
}

interface TabBarProps {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
}

const TabBarContainer = styled.View<{ theme: AppTheme }>`
  height: 110px;
  background-color: ${({ theme }) => theme.colors.tabbar};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 30px;
  padding-top: ${({ theme }) => theme.spacing.xs}px;
`;

const TabBarScrollView = styled(ScrollView).attrs({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  contentContainerStyle: {
    paddingHorizontal: 4,
  },
})``;

const TabButton = styled.TouchableOpacity<{
  theme: AppTheme;
  isActive: boolean;
}>`
  justify-content: center;
  align-items: center;
  padding-vertical: ${({ theme }) => theme.spacing.xs}px;
  padding-horizontal: ${({ theme }) => theme.spacing.sm}px;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  margin-horizontal: 2px;
  background-color: ${({ theme, isActive }) =>
    isActive ? theme.colors.primary : "transparent"};
  min-height: 50px;
  min-width: 80px;
`;

const TabIcon = styled.Text<{ theme: AppTheme; isActive: boolean }>`
  font-size: 18px;
  color: ${({ theme, isActive }) => (isActive ? "#FFFFFF" : theme.colors.text)};
  margin-bottom: 2px;
`;

const TabLabel = styled.Text<{ theme: AppTheme; isActive: boolean }>`
  font-size: 9px;
  font-weight: ${({ isActive }) => (isActive ? "600" : "400")};
  color: ${({ theme, isActive }) =>
    isActive ? "#FFFFFF" : theme.colors.muted};
  text-align: center;
`;

const tabs: Tab[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "projekt", label: "Projekt", icon: "📋" },
  { key: "messdaten", label: "Messdaten", icon: "📏" },
  { key: "fotodokumentation", label: "Fotos", icon: "📷" },
  { key: "sicherheit", label: "Sicherheit", icon: "⚠️" },
  { key: "kalkulation", label: "Kalkulation", icon: "💰" },
  { key: "settings", label: "Einstellungen", icon: "⚙️" },
  { key: "entwicklung", label: "Entwicklung", icon: "🛠️" },
];

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabPress }) => {
  return (
    <TabBarContainer>
      <TabBarScrollView>
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            isActive={activeTab === tab.key}
            onPress={() => onTabPress(tab.key)}
          >
            <TabIcon isActive={activeTab === tab.key}>{tab.icon}</TabIcon>
            <TabLabel isActive={activeTab === tab.key}>{tab.label}</TabLabel>
          </TabButton>
        ))}
      </TabBarScrollView>
    </TabBarContainer>
  );
};
