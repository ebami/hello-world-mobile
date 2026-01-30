import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';

interface ActionButtonsProps {
  onDraw: () => void;
  onPlay: () => void;
  onPass?: () => void;
  onDeclareLastCard?: () => void;
  canDraw: boolean;
  canPlay: boolean;
  canPass?: boolean;
  canDeclareLastCard?: boolean;
  isPlayerTurn: boolean;
}

export default function ActionButtons({
  onDraw,
  onPlay,
  onPass,
  onDeclareLastCard,
  canDraw,
  canPlay,
  canPass = false,
  canDeclareLastCard = false,
  isPlayerTurn,
}: ActionButtonsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.mainActions}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.drawButton,
            (!canDraw || !isPlayerTurn) && styles.buttonDisabled,
          ]}
          onPress={onDraw}
          disabled={!canDraw || !isPlayerTurn}
          activeOpacity={0.7}
          accessibilityLabel="Draw a card"
          accessibilityRole="button"
        >
          <Text style={[
            styles.buttonText,
            (!canDraw || !isPlayerTurn) && styles.buttonTextDisabled,
          ]}>
            DRAW
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.playButton,
            (!canPlay || !isPlayerTurn) && styles.buttonDisabled,
          ]}
          onPress={onPlay}
          disabled={!canPlay || !isPlayerTurn}
          activeOpacity={0.7}
          accessibilityLabel="Play selected cards"
          accessibilityRole="button"
        >
          <Text style={[
            styles.buttonText,
            styles.playButtonText,
            (!canPlay || !isPlayerTurn) && styles.buttonTextDisabled,
          ]}>
            PLAY
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.secondaryActions}>
        {onDeclareLastCard && (
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              !canDeclareLastCard && styles.secondaryButtonDisabled,
            ]}
            onPress={onDeclareLastCard}
            disabled={!canDeclareLastCard}
            activeOpacity={0.7}
            accessibilityLabel="Declare last card"
            accessibilityRole="button"
          >
            <Text style={[
              styles.secondaryButtonText,
              !canDeclareLastCard && styles.secondaryButtonTextDisabled,
            ]}>
              LAST CARD!
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    paddingBottom: 5,
    alignItems: 'center',
    flexShrink: 0,
  },
  mainActions: {
    flexDirection: 'row',
    gap: 15,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  drawButton: {
    backgroundColor: '#2c3e50',
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  playButton: {
    backgroundColor: '#ffd700',
  },
  buttonDisabled: {
    backgroundColor: '#444',
    borderColor: '#666',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#ffd700',
  },
  playButtonText: {
    color: '#1a1a2e',
  },
  buttonTextDisabled: {
    color: '#888',
  },
  secondaryActions: {
    marginTop: 15,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e63946',
    backgroundColor: 'transparent',
  },
  secondaryButtonDisabled: {
    borderColor: '#666',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e63946',
  },
  secondaryButtonTextDisabled: {
    color: '#666',
  },
});
