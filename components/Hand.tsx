import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Platform } from 'react-native';
import Animated, { LinearTransition, SlideInRight } from 'react-native-reanimated';
import type { Card as CardType } from '../game/types';
import Card from './Card';

interface HandProps {
  readonly cards: CardType[];
  readonly selectedCards?: CardType[];
  readonly onCardPress?: (card: CardType) => void;
  readonly faceDown?: boolean;
  readonly disabled?: boolean;
  readonly maxVisible?: number;
  /** Enable dealing/draw animation for new cards */
  readonly animateDealing?: boolean;
}

export default function Hand({
  cards,
  selectedCards = [],
  onCardPress,
  faceDown = false,
  disabled = false,
  maxVisible = 10,
  animateDealing = true,
}: HandProps) {
  const isSelected = (card: CardType) =>
    selectedCards.some((c) => c.id === card.id);

  // Track previous card count to detect new cards
  const prevCardCount = useRef(cards.length);
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());

  // Detect newly added cards for animation
  useEffect(() => {
    if (cards.length > prevCardCount.current) {
      // New cards were added
      const newIds = new Set<string>();
      for (let i = prevCardCount.current; i < cards.length; i++) {
        newIds.add(cards[i].id);
      }
      setNewCardIds(newIds);
      
      // Clear new card flags after animation completes
      const timer = setTimeout(() => {
        setNewCardIds(new Set());
      }, 500);
      
      return () => clearTimeout(timer);
    }
    prevCardCount.current = cards.length;
  }, [cards.length, cards]);

  // Calculate overlap based on number of cards
  const getCardMargin = () => {
    if (cards.length <= 4) return -10;
    if (cards.length <= 6) return -25;
    if (cards.length <= 8) return -35;
    if (cards.length <= 10) return -45;
    return -55;
  };

  // Determine if animations should be used (skip on web for compatibility)
  const useAnimations = animateDealing && Platform.OS !== 'web';

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cards.map((card, index) => {
          const isNewCard = newCardIds.has(card.id);
          
          return (
            <Animated.View
              key={card.id}
              layout={useAnimations ? LinearTransition.springify().damping(15).stiffness(100) : undefined}
              entering={useAnimations && isNewCard ? SlideInRight.delay(50).springify().damping(12) : undefined}
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
                animateEntry={useAnimations && isNewCard}
                entryDelay={index * 50}
              />
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    overflow: 'visible',
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 5,
    alignItems: 'center',
  },
  cardWrapper: {
    zIndex: 1,
  },
});

