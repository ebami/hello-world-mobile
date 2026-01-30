import React from 'react';
import { StyleSheet, Image, TouchableOpacity, View, Text } from 'react-native';
import type { Card as CardType } from '../game/types';
import { getCardImage, cardBack } from '../assets/cardImages';

interface CardProps {
  card: CardType;
  faceDown?: boolean;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function Card({
  card,
  faceDown = false,
  selected = false,
  onPress,
  disabled = false,
  size = 'medium',
}: CardProps) {
  const sizeStyles = {
    small: { width: 50, height: 70 },
    medium: { width: 70, height: 98 },
    large: { width: 90, height: 126 },
  };

  const dimensions = sizeStyles[size];
  const imageSource = faceDown ? cardBack : getCardImage(card.rank, card.suit);

  const cardContent = (
    <View
      style={[
        styles.cardContainer,
        dimensions,
        selected && styles.selected,
        disabled && styles.disabled,
      ]}
      accessibilityLabel={faceDown ? 'Face down card' : `${card.rank} of ${getSuitName(card.suit)}`}
      accessibilityRole="button"
    >
      <Image
        source={imageSource}
        style={[styles.cardImage, dimensions]}
        resizeMode="contain"
      />
      {selected && <View style={[styles.selectedOverlay, dimensions]} />}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.touchable}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

function getSuitName(suit: string): string {
  const suitNames: Record<string, string> = {
    '♠': 'spades',
    '♥': 'hearts',
    '♦': 'diamonds',
    '♣': 'clubs',
  };
  return suitNames[suit] || suit;
}

const styles = StyleSheet.create({
  touchable: {
    marginHorizontal: 2,
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  cardImage: {
    borderRadius: 8,
  },
  selected: {
    borderWidth: 3,
    borderColor: '#ffd700',
    transform: [{ translateY: -10 }],
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 8,
  },
  disabled: {
    opacity: 0.6,
  },
});
