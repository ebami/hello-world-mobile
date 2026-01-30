import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Difficulty } from '../game/ai';

interface SinglePlayerSetupProps {
  readonly onBack: () => void;
  readonly onStartGame: (difficulty: Difficulty) => void;
}

const difficulties: { value: Difficulty; label: string; description: string; emoji: string }[] = [
  {
    value: 'easy',
    label: 'Easy',
    description: 'Bot makes random mistakes',
    emoji: '😊',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Balanced AI strategy',
    emoji: '🤔',
  },
  {
    value: 'hard',
    label: 'Hard',
    description: 'Aggressive, optimal play',
    emoji: '😈',
  },
];

export default function SinglePlayerSetup({ onBack, onStartGame }: SinglePlayerSetupProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Single Player</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>🎮 Select Difficulty</Text>
        
        <View style={styles.difficultyOptions}>
          {difficulties.map((diff) => (
            <TouchableOpacity
              key={diff.value}
              style={[
                styles.difficultyCard,
                selectedDifficulty === diff.value && styles.difficultyCardSelected,
              ]}
              onPress={() => setSelectedDifficulty(diff.value)}
              activeOpacity={0.7}
              accessibilityLabel={`${diff.label} difficulty: ${diff.description}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedDifficulty === diff.value }}
            >
              <Text style={styles.difficultyEmoji}>{diff.emoji}</Text>
              <Text style={[
                styles.difficultyLabel,
                selectedDifficulty === diff.value && styles.difficultyLabelSelected,
              ]}>
                {diff.label}
              </Text>
              <Text style={styles.difficultyDescription}>{diff.description}</Text>
              {selectedDifficulty === diff.value && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.selectedCheck}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Start Game Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => onStartGame(selectedDifficulty)}
          activeOpacity={0.8}
          accessibilityLabel="Start game"
          accessibilityRole="button"
        >
          <Text style={styles.startButtonText}>START GAME</Text>
        </TouchableOpacity>

        {/* Game Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🃏 Game Info</Text>
          <Text style={styles.infoText}>
            • You vs AI opponent{'\n'}
            • 5 cards dealt each{'\n'}
            • First to empty hand wins!
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 20,
  },
  backButtonText: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginRight: 60,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 25,
    marginTop: 20,
  },
  difficultyOptions: {
    width: '100%',
    gap: 15,
  },
  difficultyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    position: 'relative',
  },
  difficultyCardSelected: {
    borderColor: '#ffd700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  difficultyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  difficultyLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  difficultyLabelSelected: {
    color: '#ffd700',
  },
  difficultyDescription: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffd700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheck: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  startButton: {
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
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    letterSpacing: 2,
  },
  infoBox: {
    marginTop: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 22,
  },
});
