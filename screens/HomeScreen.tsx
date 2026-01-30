import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { RulesNavigator } from './rules';
import SinglePlayerSetup from './SinglePlayerSetup';
import GameScreen from './GameScreen';
import { ErrorBoundary } from '../components';
import type { Difficulty } from '../game/ai';

type ScreenState = 'home' | 'rules' | 'setup' | 'game';

export default function HomeScreen() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('home');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const handleStartGame = (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setCurrentScreen('game');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
  };

  const handlePlayAgain = () => {
    // Re-mount GameScreen by going to setup and immediately back to game
    setCurrentScreen('setup');
    setTimeout(() => setCurrentScreen('game'), 0);
  };

  if (currentScreen === 'rules') {
    return <RulesNavigator onBack={handleBackToHome} />;
  }

  if (currentScreen === 'setup') {
    return (
      <SinglePlayerSetup
        onBack={handleBackToHome}
        onStartGame={handleStartGame}
      />
    );
  }

  if (currentScreen === 'game') {
    return (
      <ErrorBoundary onReset={handleBackToHome}>
        <GameScreen
          difficulty={difficulty}
          onBack={handleBackToHome}
          onPlayAgain={handlePlayAgain}
        />
      </ErrorBoundary>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient overlay */}
      <View style={styles.backgroundOverlay} />
      
      {/* Header with decorative cards */}
      <View style={styles.cardDecoration}>
        <View style={[styles.decorativeCard, styles.cardLeft]}>
          <Text style={styles.cardSuit}>♠</Text>
        </View>
        <View style={[styles.decorativeCard, styles.cardRight]}>
          <Text style={styles.cardSuitRed}>♥</Text>
        </View>
      </View>

      {/* Main Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleTop}>BLACK JACK</Text>
        <Text style={styles.titleBottom}>BLACK</Text>
        <View style={styles.titleUnderline} />
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>♠ ♥ ♣ ♦</Text>
      <Text style={styles.tagline}>Test Your Luck. Beat the Dealer.</Text>

      {/* Play Button */}
      <TouchableOpacity 
        style={styles.playButton} 
        activeOpacity={0.8}
        onPress={() => setCurrentScreen('setup')}
        accessibilityLabel="Play now"
        accessibilityRole="button"
      >
        <Text style={styles.playButtonText}>PLAY NOW</Text>
      </TouchableOpacity>

      {/* Secondary Buttons */}
      <View style={styles.secondaryButtons}>
        <TouchableOpacity 
          style={styles.secondaryButton} 
          activeOpacity={0.7}
          onPress={() => setCurrentScreen('rules')}
          accessibilityLabel="How to play"
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>How to Play</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.7}>
          <Text style={styles.secondaryButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>🎰 High Stakes. Big Wins. 🎰</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a2e',
  },
  cardDecoration: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  decorativeCard: {
    width: 60,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  cardLeft: {
    transform: [{ rotate: '-15deg' }],
    marginRight: -15,
    zIndex: 1,
  },
  cardRight: {
    transform: [{ rotate: '15deg' }],
    marginLeft: -15,
  },
  cardSuit: {
    fontSize: 36,
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
  cardSuitRed: {
    fontSize: 36,
    color: '#e63946',
    fontWeight: 'bold',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  titleTop: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffd700',
    letterSpacing: 4,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  titleBottom: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 8,
    marginTop: -8,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  titleUnderline: {
    width: 200,
    height: 3,
    backgroundColor: '#ffd700',
    marginTop: 10,
    borderRadius: 2,
  },
  subtitle: {
    fontSize: 24,
    color: '#e63946',
    marginTop: 15,
    letterSpacing: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#a0a0a0',
    marginTop: 10,
    fontStyle: 'italic',
  },
  playButton: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 30,
    marginTop: 40,
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  playButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a2e',
    letterSpacing: 2,
  },
  secondaryButtons: {
    flexDirection: 'row',
    marginTop: 30,
    gap: 20,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#ffd700',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#ffd700',
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});
