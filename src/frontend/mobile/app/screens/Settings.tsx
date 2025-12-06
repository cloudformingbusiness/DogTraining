import React from "react";
import { View } from "react-native";
import styled from "styled-components/native";
import { Button, Card, CardText, Text } from "../components";
import type { AppTheme } from "../themes";

const Wrapper = styled.View<{ theme: AppTheme }>`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Header = styled.View<{ theme: AppTheme }>`
  padding: ${({ theme }) => theme.spacing.lg}px;
  padding-bottom: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.card};
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

const HeaderTitle = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const HeaderIcon = styled.Text`
  font-size: 28px;
  margin-right: 12px;
`;

const ScrollContainer = styled.ScrollView`
  flex: 1;
`;

interface SettingsProps {
  toggleTheme: () => void;
  onLogout: () => void;
}

const SettingsScreen: React.FC<SettingsProps> = ({ onLogout, toggleTheme }) => {
  return (
    <Wrapper>
      <ScrollContainer
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Header>
          <HeaderTitle>
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <HeaderIcon>⚙️</HeaderIcon>
              <Text
                variant="h1"
                numberOfLines={2}
                style={{ flexShrink: 1, flexWrap: "wrap" }}
              >
                Einstellungen
              </Text>
            </View>
          </HeaderTitle>
          <CardText style={{ marginTop: 8, opacity: 0.8 }}>
            Persönliche Einstellungen und App-Konfiguration
          </CardText>
        </Header>
        <View style={{ padding: 16 }}>
          {/* Theme Einstellungen */}
          <Card title="🎨 Theme Einstellungen">
            <CardText>Hier können Sie das Aussehen der App anpassen.</CardText>
            <Button variant="primary" onPress={toggleTheme}>
              <Text>Theme wechseln</Text>
            </Button>
          </Card>
        </View>
      </ScrollContainer>
      {/* Logout-Bereich fixiert am unteren Rand, außerhalb des ScrollContainers */}
      {typeof onLogout === "function" && (
        <View
          style={{
            padding: 24,
            alignItems: "center",
            borderTopWidth: 1,
            borderTopColor: "#e0e0e0",
            backgroundColor: "#f7f7f7",
          }}
        >
          <Button variant="danger" onPress={onLogout}>
            <Text>🚪 Abmelden</Text>
          </Button>
        </View>
      )}
    </Wrapper>
  );
};

export default SettingsScreen;
