import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import type { Card as CardType } from '../game/types';
import Card from './Card';

interface DiscardPileProps {
  topCard?: CardType;
  deckCount: number;
  drawPressure?: number;
}

export default function DiscardPile({
  topCard,
  deckCount,
  drawPressure = 0,
}: DiscardPileProps) {
  // Create a dummy card for the deck display
  const dummyCard = { id: 'deck', rank: 'A' as const, suit: '♠' as const };

  return (
    <View style={styles.container}>
      {/* Deck */}
      <View style={styles.pile}>
        <View style={styles.deckStack}>
          {deckCount > 0 ? (
            <>
              {deckCount > 2 && <View style={[styles.deckShadow, styles.deckShadow2]} />}
              {deckCount > 1 && <View style={[styles.deckShadow, styles.deckShadow1]} />}
              <Card card={dummyCard} faceDown size="large" />
            </>
          ) : (
            <View style={styles.emptyPile}>
              <Text style={styles.emptyText}>Empty</Text>
            </View>
          )}
        </View>
        <Text style={styles.pileLabel}>DECK</Text>
        <Text style={styles.deckCount}>{deckCount}</Text>
      </View>

      {/* Discard Pile */}
      <View style={styles.pile}>
        {topCard ? (
          <Card card={topCard} size="large" />
        ) : (
          <View style={styles.emptyPile}>
            <Text style={styles.emptyText}>Empty</Text>
          </View>
        )}
        <Text style={styles.pileLabel}>DISCARD</Text>
      </View>

      {/* Draw Pressure Indicator */}
      {drawPressure > 0 && (
        <View style={styles.pressureContainer}>
          <Text style={styles.pressureText}>⚠️ +{drawPressure}</Text>
          <Text style={styles.pressureSubtext}>Draw Pressure</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    padding: 20,
  },
  pile: {
    alignItems: 'center',
  },
  deckStack: {
    width: 90,
    height: 126,
    position: 'relative',
  },
  deckShadow: {
    position: 'absolute',
    width: 90,
    height: 126,
    backgroundColor: '#2a4a6a',
    borderRadius: 8,
  },
  deckShadow1: {
    top: 2,
    left: 2,
  },
  deckShadow2: {
    top: 4,
    left: 4,
  },
  pileLabel: {
    color: '#a0a0a0',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 1,
  },
  deckCount: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  emptyPile: {
    width: 90,
    height: 126,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#666',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  pressureContainer: {
    position: 'absolute',
    right: 20,
    top: '50%',
    backgroundColor: '#e63946',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    transform: [{ translateY: -30 }],
  },
  pressureText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  pressureSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    textTransform: 'uppercase',
  },
});
