import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import type { Card as CardType } from '../game/types';
import Hand from './Hand';

interface PlayerAreaProps {
  name: string;
  cards: CardType[];
  selectedCards?: CardType[];
  onCardPress?: (card: CardType) => void;
  isCurrentTurn?: boolean;
  faceDown?: boolean;
  score?: number;
  isOpponent?: boolean;
}

export default function PlayerArea({
  name,
  cards,
  selectedCards = [],
  onCardPress,
  isCurrentTurn = false,
  faceDown = false,
  score,
  isOpponent = false,
}: PlayerAreaProps) {
  return (
    <View style={[
      styles.container,
      isCurrentTurn && styles.currentTurn,
      isOpponent && styles.opponentContainer,
    ]}>
      <View style={styles.header}>
        <View style={styles.nameContainer}>
          <View style={[
            styles.turnIndicator,
            isCurrentTurn && styles.turnIndicatorActive,
          ]} />
          <Text style={[
            styles.name,
            isCurrentTurn && styles.nameActive,
          ]}>
            {name}
          </Text>
        </View>
        {score !== undefined && (
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Cards</Text>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>
        )}
      </View>

      <Hand
        cards={cards}
        selectedCards={selectedCards}
        onCardPress={onCardPress}
        faceDown={faceDown}
        disabled={!isCurrentTurn || faceDown}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginVertical: 5,
    marginHorizontal: 5,
  },
  opponentContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  currentTurn: {
    borderWidth: 2,
    borderColor: '#ffd700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    paddingHorizontal: 10,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  turnIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#666',
    marginRight: 8,
  },
  turnIndicatorActive: {
    backgroundColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a0a0a0',
  },
  nameActive: {
    color: '#ffd700',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
