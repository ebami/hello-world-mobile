import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import type { Card as CardType } from '../game/types';
import Card from './Card';

interface HandProps {
  cards: CardType[];
  selectedCards?: CardType[];
  onCardPress?: (card: CardType) => void;
  faceDown?: boolean;
  disabled?: boolean;
  maxVisible?: number;
}

export default function Hand({
  cards,
  selectedCards = [],
  onCardPress,
  faceDown = false,
  disabled = false,
  maxVisible = 10,
}: HandProps) {
  const isSelected = (card: CardType) =>
    selectedCards.some((c) => c.id === card.id);

  // Calculate overlap based on number of cards
  const getCardMargin = () => {
    if (cards.length <= 4) return -10;
    if (cards.length <= 6) return -25;
    if (cards.length <= 8) return -35;
    if (cards.length <= 10) return -45;
    return -55;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cards.map((card, index) => (
          <View
            key={card.id}
            style={[
              styles.cardWrapper,
              index > 0 && { marginLeft: getCardMargin() },
            ]}
          >
            <Card
              card={card}
              faceDown={faceDown}
              selected={isSelected(card)}
              onPress={onCardPress ? () => onCardPress(card) : undefined}
              disabled={disabled}
              size="medium"
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  cardWrapper: {
    zIndex: 1,
  },
});
