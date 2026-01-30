import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import type { Suit } from '../game/types';

interface SuitPickerProps {
  visible: boolean;
  onSelect: (suit: Suit) => void;
  onCancel: () => void;
}

const suits: { suit: Suit; emoji: string; color: string }[] = [
  { suit: '♠', emoji: '♠', color: '#1a1a2e' },
  { suit: '♥', emoji: '♥', color: '#e63946' },
  { suit: '♦', emoji: '♦', color: '#e63946' },
  { suit: '♣', emoji: '♣', color: '#1a1a2e' },
];

export default function SuitPicker({ visible, onSelect, onCancel }: SuitPickerProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Choose a Suit</Text>
          <Text style={styles.subtitle}>Ace changes the suit to play</Text>
          
          <View style={styles.suitsContainer}>
            {suits.map(({ suit, emoji, color }) => (
              <TouchableOpacity
                key={suit}
                style={[styles.suitButton, { borderColor: color }]}
                onPress={() => onSelect(suit)}
                activeOpacity={0.7}
                accessibilityLabel={`Select ${getSuitName(suit)}`}
                accessibilityRole="button"
              >
                <Text style={[styles.suitEmoji, { color }]}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function getSuitName(suit: Suit): string {
  const names: Record<Suit, string> = {
    '♠': 'Spades',
    '♥': 'Hearts',
    '♦': 'Diamonds',
    '♣': 'Clubs',
  };
  return names[suit];
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffd700',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 25,
  },
  suitsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  suitButton: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  suitEmoji: {
    fontSize: 32,
  },
  cancelButton: {
    marginTop: 25,
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#666',
  },
  cancelText: {
    color: '#a0a0a0',
    fontSize: 14,
  },
});
