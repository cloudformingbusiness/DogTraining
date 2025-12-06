import React from "react";
import { Button, FlatList, View } from "react-native";
import styled from "styled-components/native";
import { Card, CardText, Text } from "../components";
import { HistoryEntry } from "../MobileApp";
import { AppTheme } from "../themes";

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

const ListItem = styled.View`
  background-color: ${(props) => props.theme.card};
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 10px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const InfoText = styled.Text`
  font-size: 16px;
  color: ${(props) => props.theme.text};
`;

const TimeText = styled.Text`
  font-size: 18px;
  color: ${(props) => props.theme.primary};
  font-weight: 600;
`;

interface VerlaufScreenProps {
  history: HistoryEntry[];
  onClearHistory: () => void;
}

const VerlaufScreen: React.FC<VerlaufScreenProps> = ({
  history,
  onClearHistory,
}) => {
  return (
    <Wrapper>
      <ScrollContainer>
        <Header>
          <HeaderTitle>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <HeaderIcon>📜</HeaderIcon>
              <Text variant="h1">Verlauf</Text>
            </View>
          </HeaderTitle>
          <CardText style={{ marginTop: 8, opacity: 0.8 }}>
            Alle gemessenen Zeiten im Überblick
          </CardText>
        </Header>

        <View style={{ padding: 16 }}>
          <Card title="Aktionen">
            <Button
              title="Verlauf löschen"
              onPress={onClearHistory}
              color="#e74c3c"
            />
          </Card>

          <Card title="Messungen">
            <FlatList
              data={history}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item }) => (
                <ListItem>
                  <View>
                    <InfoText>
                      {item.dog} ({item.team})
                    </InfoText>
                  </View>
                  <TimeText>{item.time.toFixed(3)}s</TimeText>
                </ListItem>
              )}
              ListEmptyComponent={
                <CardText>Noch keine Messungen vorhanden.</CardText>
              }
            />
          </Card>
        </View>
      </ScrollContainer>
    </Wrapper>
  );
};

export default VerlaufScreen;
