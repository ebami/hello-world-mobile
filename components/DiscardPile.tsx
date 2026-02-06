import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
  ZoomIn,
} from 'react-native-reanimated';
import type { Card as CardType } from '../game/types';
import Card from './Card';

interface DiscardPileProps {
  readonly topCard?: CardType;
  readonly deckCount: number;
  readonly drawPressure?: number;
}

export default function DiscardPile({
  topCard,
  deckCount,
  drawPressure = 0,
}: DiscardPileProps) {
  // Track previous top card to detect new discards
  const prevTopCardId = useRef<string | undefined>(undefined);
  
  // Animation values
  const discardScale = useSharedValue(1);
  const discardRotation = useSharedValue(0);
  const pressurePulse = useSharedValue(1);
  const pressureGlow = useSharedValue(0);

  // Create a dummy card for the deck display
  const dummyCard = { id: 'deck', rank: 'A' as const, suit: '♠' as const };

  // Detect when a new card is played to discard pile
  useEffect(() => {
    if (topCard && topCard.id !== prevTopCardId.current && Platform.OS !== 'web') {
      // Animate card landing
      discardScale.value = withSequence(
        withSpring(1.15, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      discardRotation.value = withSequence(
        withTiming(Math.random() * 6 - 3, { duration: 100 }),
        withSpring(0, { damping: 10, stiffness: 100 })
      );
    }
    prevTopCardId.current = topCard?.id;
  }, [topCard, discardScale, discardRotation]);

  // Pulse animation for draw pressure indicator
  useEffect(() => {
    if (drawPressure > 0 && Platform.OS !== 'web') {
      pressurePulse.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      pressureGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.5, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      pressurePulse.value = 1;
      pressureGlow.value = 0;
    }
  }, [drawPressure, pressurePulse, pressureGlow]);

  // Animated styles for discard card
  const discardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: discardScale.value },
      { rotate: `${discardRotation.value}deg` },
    ],
  }));

  // Animated styles for pressure indicator
  const pressureAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressurePulse.value }],
    shadowOpacity: pressureGlow.value * 0.8,
    shadowRadius: 10 + pressureGlow.value * 10,
  }));

  const useAnimations = Platform.OS !== 'web';

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
        <Animated.View style={[styles.cardWrapper, discardAnimatedStyle]}>
          {topCard ? (
            <Card card={topCard} size="large" />
          ) : (
            <View style={styles.emptyPile}>
              <Text style={styles.emptyText}>Empty</Text>
            </View>
          )}
        </Animated.View>
        <Text style={styles.pileLabel}>DISCARD</Text>
      </View>

      {/* Draw Pressure Indicator */}
      {drawPressure > 0 && (
        <Animated.View
          entering={useAnimations ? ZoomIn.springify().damping(12) : undefined}
          style={[styles.pressureContainer, pressureAnimatedStyle]}
        >
          <Text style={styles.pressureText}>⚠️ +{drawPressure}</Text>
          <Text style={styles.pressureSubtext}>Draw Pressure</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
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
  cardWrapper: {
    width: 90,
    height: 126,
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowColor: '#e63946',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
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
