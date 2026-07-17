/**
 * @fileoverview Game over overlay with celebration effects.
 *
 * Displays win/lose state with animations using react-native-reanimated,
 * and action buttons for playing again or viewing stats.
 *
 * @module components/GameOverOverlay
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { hapticButtonPress, hapticGameWin, hapticGameLoss } from '../utils/haptics';
import { playWin, playLose } from '../utils/soundManager';

interface GameOverOverlayProps {
  readonly visible: boolean;
  readonly winner: number | null; // 0 = player, 1 = opponent, null = draw
  readonly onPlayAgain: () => void;
  readonly onMainMenu: () => void;
  readonly onViewStats: () => void;
}

/**
 * Animated confetti particle for wins.
 */
function ConfettiParticle({ color, delay, startX }: { readonly color: string; readonly delay: number; readonly startX: number }) {
  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      progress.value = withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration: 3000 + Math.random() * 2000, easing: Easing.linear }),
          -1,
          false
        )
      );
      rotation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [progress, rotation, delay]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [-50, 400]);
    const translateX = Math.sin(progress.value * Math.PI * 4) * 30;
    const opacity = interpolate(progress.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
    
    return {
      transform: [
        { translateY },
        { translateX },
        { rotate: `${rotation.value}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        { backgroundColor: color, left: `${startX}%` },
        animatedStyle,
      ]}
    />
  );
}

/**
 * Animated confetti decoration for wins.
 */
function ConfettiDecoration() {
  const colors = ['#ffd700', '#ff6b6b', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa'];
  const particles: Array<{ color: string; delay: number; startX: number }> = [];

  for (let i = 0; i < 20; i++) {
    particles.push({
      color: colors[i % colors.length],
      delay: i * 100,
      startX: 5 + Math.random() * 90,
    });
  }

  if (Platform.OS === 'web') {
    // Static confetti for web
    return (
      <View style={styles.confettiContainer} pointerEvents="none">
        {colors.map((color) => (
          <View
            key={color}
            style={[
              styles.confettiDot,
              {
                backgroundColor: color,
                left: `${15 + colors.indexOf(color) * 12}%`,
                top: `${10 + (colors.indexOf(color) % 3) * 8}%`,
              },
            ]}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {particles.map((particle) => (
        <ConfettiParticle
          key={`${particle.color}-${particle.startX}`}
          color={particle.color}
          delay={particle.delay}
          startX={particle.startX}
        />
      ))}
    </View>
  );
}

export default function GameOverOverlay({
  visible,
  winner,
  onPlayAgain,
  onMainMenu,
  onViewStats,
}: GameOverOverlayProps) {
  const fadeProgress = useSharedValue(0);
  const scaleProgress = useSharedValue(0.8);
  const titleBounce = useSharedValue(1);

  const isWin = winner === 0;
  const isDraw = winner === null;

  useEffect(() => {
    if (visible) {
      // Trigger haptics and sounds
      if (isWin) {
        hapticGameWin();
        playWin();
      } else {
        hapticGameLoss();
        playLose();
      }

      // Animate in
      fadeProgress.value = withTiming(1, { duration: 300 });
      scaleProgress.value = withSpring(1, { damping: 12, stiffness: 100 });

      // Title bounce for wins
      if (isWin && Platform.OS !== 'web') {
        titleBounce.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 500, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
      }
    } else {
      // Reset animations
      fadeProgress.value = 0;
      scaleProgress.value = 0.8;
      titleBounce.value = 1;
    }
  }, [visible, isWin, fadeProgress, scaleProgress, titleBounce]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fadeProgress.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleProgress.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleBounce.value }],
  }));

  if (!visible) return null;

  const handlePlayAgain = () => {
    hapticButtonPress();
    onPlayAgain();
  };

  const handleMainMenu = () => {
    hapticButtonPress();
    onMainMenu();
  };

  const handleViewStats = () => {
    hapticButtonPress();
    onViewStats();
  };

  const getTitle = () => {
    if (isWin) return '🎉 Victory!';
    if (isDraw) return '🤝 Draw!';
    return '😔 Defeat';
  };
  
  const getSubtitle = () => {
    if (isWin) return 'Congratulations! You won!';
    if (isDraw) return "It's a tie game!";
    return 'Better luck next time!';
  };
  
  const title = getTitle();
  const subtitle = getSubtitle();

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      {/* Confetti decoration for wins */}
      {isWin && <ConfettiDecoration />}

      <Animated.View style={[styles.content, contentStyle]}>
        {/* Title */}
        <Animated.Text
          style={[
            styles.title,
            isWin && styles.winTitle,
            !isWin && !isDraw && styles.loseTitle,
            titleStyle,
          ]}
        >
          {title}
        </Animated.Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {subtitle}
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handlePlayAgain}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Play Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleViewStats}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>📊 View Stats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.tertiaryButton]}
            onPress={handleMainMenu}
            activeOpacity={0.8}
          >
            <Text style={styles.tertiaryButtonText}>Main Menu</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    padding: 30,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  winTitle: {
    color: '#ffd700',
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 20,
  },
  loseTitle: {
    color: '#888',
  },
  subtitle: {
    fontSize: 18,
    color: '#a0a0a0',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 280,
    gap: 15,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#ffd700',
  },
  primaryButtonText: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
  },
  tertiaryButtonText: {
    color: '#888',
    fontSize: 14,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  confettiParticle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
    top: -20,
  },
  confettiDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.8,
  },
});
