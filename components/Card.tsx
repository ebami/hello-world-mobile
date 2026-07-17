import React, { useEffect } from 'react';
import { StyleSheet, Image, TouchableOpacity, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import type { Card as CardType } from '../game/types';
import { getCardImage, cardBack } from '../assets/cardImages';

interface CardProps {
  readonly card: CardType;
  readonly faceDown?: boolean;
  readonly selected?: boolean;
  readonly onPress?: () => void;
  readonly disabled?: boolean;
  readonly size?: 'small' | 'medium' | 'large';
  /** Enable entry animation for newly dealt/drawn cards */
  readonly animateEntry?: boolean;
  /** Delay for staggered entry animations (ms) */
  readonly entryDelay?: number;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function Card({
  card,
  faceDown = false,
  selected = false,
  onPress,
  disabled = false,
  size = 'medium',
  animateEntry = false,
  entryDelay = 0,
}: CardProps) {
  const sizeStyles = {
    small: { width: 50, height: 70 },
    medium: { width: 70, height: 98 },
    large: { width: 90, height: 126 },
  };

  const dimensions = sizeStyles[size];
  
  // Animation values
  const flipProgress = useSharedValue(faceDown ? 0 : 1);
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  // Handle flip animation when faceDown changes
  useEffect(() => {
    flipProgress.value = withTiming(faceDown ? 0 : 1, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });
  }, [faceDown, flipProgress]);

  // Handle selection animation
  useEffect(() => {
    if (selected) {
      scale.value = withSpring(1.05, { damping: 15, stiffness: 300 });
      translateY.value = withSpring(-12, { damping: 15, stiffness: 300 });
    } else {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 300 });
    }
  }, [selected, scale, translateY]);

  // Animated styles for flip effect
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 0]);
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
      ],
      backfaceVisibility: 'hidden',
      opacity: flipProgress.value > 0.5 ? 1 : 0,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, -180]);
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
      ],
      backfaceVisibility: 'hidden',
      opacity: flipProgress.value <= 0.5 ? 1 : 0,
      position: 'absolute',
      top: 0,
      left: 0,
    };
  });

  // Selection scale and lift animation
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
      ],
    };
  });

  const handlePress = () => {
    if (onPress && !disabled) {
      // Quick press feedback: squish, then settle back. Use withSequence rather
      // than a withSpring completion callback that reassigns scale.value — that
      // chained-callback pattern overflows the stack in Reanimated 4's web
      // runtime (decorateAnimation recursion). This matches how DiscardPile and
      // GameOverOverlay already sequence their animations.
      scale.value = withSequence(
        withSpring(0.95, { damping: 15, stiffness: 400 }),
        withSpring(selected ? 1.05 : 1, { damping: 15, stiffness: 300 }),
      );
      onPress();
    }
  };

  const frontImage = getCardImage(card.rank, card.suit);
  const backImage = cardBack;

  // Entry animation props
  const enteringAnimation = animateEntry && Platform.OS !== 'web'
    ? FadeInDown.delay(entryDelay).duration(300).springify()
    : undefined;

  // Layout (entering) animation lives on an outer wrapper, while the transform
  // (scale/translateY) stays on the card body. Keeping them on separate views
  // avoids Reanimated's "transform may be overwritten by a layout animation"
  // warning — and the visual conflict behind it.
  const cardContent = (
    <Animated.View entering={enteringAnimation}>
      <Animated.View
        style={[
          styles.cardContainer,
          dimensions,
          containerAnimatedStyle,
          selected && styles.selectedBorder,
          disabled && styles.disabled,
        ]}
        accessibilityLabel={faceDown ? 'Face down card' : `${card.rank} of ${getSuitName(card.suit)}`}
        accessibilityRole="button"
      >
        {/* Front face */}
        <Animated.View style={[styles.cardFace, dimensions, frontAnimatedStyle]}>
          <Image
            source={frontImage}
            style={[styles.cardImage, dimensions]}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Back face */}
        <Animated.View style={[styles.cardFace, dimensions, backAnimatedStyle]}>
          <Image
            source={backImage}
            style={[styles.cardImage, dimensions]}
            resizeMode="contain"
          />
        </Animated.View>

        {selected && <View style={[styles.selectedOverlay, dimensions]} />}
      </Animated.View>
    </Animated.View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
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
  },
  cardFace: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardImage: {
    borderRadius: 8,
  },
  selectedBorder: {
    borderWidth: 3,
    borderColor: '#ffd700',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 8,
  },
  disabled: {
    opacity: 0.6,
  },
});
