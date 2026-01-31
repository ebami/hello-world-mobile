// Multiplayer game screen using transport-agnostic interface
import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Card as CardType, Suit, PublicGameView, PrivateHandPayload } from '../game/types';
import { getValidMoves } from '../game';
import { PlayerArea, DiscardPile, ActionButtons, SuitPicker } from '../components';
import type { GameTransport } from '../networking/types';

interface MultiplayerGameScreenProps {
  readonly transport: GameTransport;
  readonly initialState: PublicGameView;
  readonly initialHand: PrivateHandPayload;
  readonly onBack: () => void;
  readonly onPlayAgain?: () => void;
}

export default function MultiplayerGameScreen({
  transport,
  initialState,
  initialHand,
  onBack,
  onPlayAgain,
}: MultiplayerGameScreenProps) {
  // Game state from server
  const [gameState, setGameState] = useState<PublicGameView>(initialState);
  const [hand, setHand] = useState<CardType[]>(initialHand.hand);
  
  // Local UI state
  const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [pendingPlay, setPendingPlay] = useState<CardType[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Find current player index
  const myPlayerId = initialHand.playerId;
  const myPlayerIndex = gameState.players.findIndex(p => p.playerId === myPlayerId);
  const isPlayerTurn = gameState.currentPlayer === myPlayerIndex;
  const topCard = gameState.discardPile.at(-1);

  // Get valid moves for current player
  const validMoves = useMemo(() => {
    if (!topCard) return { singles: [], runs: [] };
    return getValidMoves(hand, topCard, gameState.drawPressure);
  }, [hand, topCard, gameState.drawPressure]);

  // Check if player can declare last card
  const canDeclareLastCard = useMemo(() => {
    if (gameState.currentPlayer === myPlayerIndex) return false;
    if (!gameState.hasPlayed.every(Boolean)) return false;
    if (hand.length === 0) return false;
    if (gameState.lastCardCalled[myPlayerIndex]) return false;
    
    const { singles, runs } = validMoves;
    return hand.length === 1
      ? singles.some((c) => c.id === hand[0]?.id)
      : runs.some((run) => run.length === hand.length);
  }, [gameState, hand, validMoves, myPlayerIndex]);

  // Set up transport callbacks
  useEffect(() => {
    transport.setCallbacks({
      onStateUpdate: (state) => {
        setGameState(state);
        setIsProcessing(false);
      },
      onHandUpdate: (payload) => {
        if (payload.playerId === myPlayerId) {
          setHand(payload.hand);
        }
      },
      onGameOver: (winnerId, message) => {
        Alert.alert(
          'Game Over',
          message,
          [
            onPlayAgain && { text: 'Play Again', onPress: onPlayAgain },
            { text: 'Main Menu', onPress: onBack },
          ].filter(Boolean) as any
        );
      },
      onError: (error) => {
        Alert.alert('Error', error);
        setIsProcessing(false);
      },
    });
  }, [transport, myPlayerId, onBack, onPlayAgain]);

  const handleCardPress = useCallback((card: CardType) => {
    if (!isPlayerTurn || isProcessing) return;
    
    setSelectedCards((prev) =>
      prev.some((c) => c.id === card.id)
        ? prev.filter((c) => c.id !== card.id)
        : [...prev, card]
    );
  }, [isPlayerTurn, isProcessing]);

  const handlePlay = useCallback(() => {
    if (selectedCards.length === 0 || !isPlayerTurn || isProcessing) return;

    // Validate the move
    const isValid =
      selectedCards.length === 1
        ? validMoves.singles.some((c) => c.id === selectedCards[0].id)
        : validMoves.runs.some(
            (run) =>
              run.length === selectedCards.length &&
              run.every((c, idx) => c.id === selectedCards[idx].id)
          );

    if (!isValid) {
      Alert.alert('Invalid Move', 'Those cards cannot be played together.');
      setSelectedCards([]);
      return;
    }

    // Check if last card is an Ace (need suit picker)
    const lastCard = selectedCards.at(-1);
    if (lastCard?.rank === 'A') {
      setPendingPlay(selectedCards);
      setShowSuitPicker(true);
      return;
    }

    setIsProcessing(true);
    transport.sendAction({ type: 'PLAY_CARDS', cards: selectedCards });
    setSelectedCards([]);
  }, [selectedCards, isPlayerTurn, isProcessing, validMoves, transport]);

  const handleSuitSelect = useCallback((suit: Suit) => {
    if (!pendingPlay) return;
    
    const modifiedCards = pendingPlay.map((card, idx) =>
      idx === pendingPlay.length - 1 ? { ...card, suit } : card
    );
    
    setIsProcessing(true);
    transport.sendAction({ type: 'PLAY_CARDS', cards: modifiedCards });
    setSelectedCards([]);
    setPendingPlay(null);
    setShowSuitPicker(false);
  }, [pendingPlay, transport]);

  const handleDraw = useCallback(() => {
    if (!isPlayerTurn || isProcessing || gameState.deckCount === 0) return;
    setIsProcessing(true);
    transport.sendAction({ type: 'DRAW_CARD' });
    setSelectedCards([]);
  }, [isPlayerTurn, isProcessing, gameState.deckCount, transport]);

  const handleDeclareLastCard = useCallback(() => {
    if (!canDeclareLastCard) return;
    transport.sendAction({ type: 'DECLARE_LAST_CARD', player: myPlayerIndex });
  }, [canDeclareLastCard, transport, myPlayerIndex]);

  const handleQuit = useCallback(() => {
    Alert.alert(
      'Quit Game?',
      'Are you sure you want to quit? You will leave the game.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Quit', 
          style: 'destructive', 
          onPress: () => {
            transport.disconnect();
            onBack();
          }
        },
      ]
    );
  }, [transport, onBack]);

  // Get opponent data - find first opponent
  const mainOpponent = gameState.players.find(p => p.playerId !== myPlayerId);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleQuit} style={styles.quitButton}>
          <Text style={styles.quitButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.roomBadge}>🌐 MULTIPLAYER</Text>
        </View>
      </View>

      {/* Status Message */}
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>{gameState.message}</Text>
        {gameState.drawPressure > 0 && (
          <Text style={styles.pressureWarning}>
            ⚠️ Draw pressure: +{gameState.drawPressure} cards
          </Text>
        )}
      </View>

      {/* Game Area */}
      <View style={styles.gameArea}>
        {/* Opponent Area */}
        {mainOpponent && (
          <PlayerArea
            name={mainOpponent.isBot ? '🤖 Bot' : `👤 ${mainOpponent.playerId}`}
            cards={new Array(mainOpponent.handCount).fill({ id: 'hidden', rank: 'A', suit: '♠' })}
            isCurrentTurn={gameState.currentPlayer !== myPlayerIndex}
            faceDown
            score={mainOpponent.handCount}
            isOpponent
          />
        )}

        {/* Discard Pile & Deck */}
        <DiscardPile
          topCard={topCard}
          deckCount={gameState.deckCount}
          drawPressure={gameState.drawPressure}
        />

        {/* Player Area */}
        <PlayerArea
          name="👤 You"
          cards={hand}
          selectedCards={selectedCards}
          onCardPress={handleCardPress}
          isCurrentTurn={isPlayerTurn}
          score={hand.length}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonWrapper}>
        <ActionButtons
          onDraw={handleDraw}
          onPlay={handlePlay}
          onDeclareLastCard={handleDeclareLastCard}
          canDraw={gameState.deckCount > 0}
          canPlay={selectedCards.length > 0}
          canDeclareLastCard={canDeclareLastCard}
          isPlayerTurn={isPlayerTurn && !isProcessing}
        />
      </View>

      {/* Last Card Indicator */}
      {gameState.lastCardCalled[myPlayerIndex] && (
        <View style={styles.lastCardIndicator}>
          <Text style={styles.lastCardText}>🎯 LAST CARD DECLARED!</Text>
        </View>
      )}

      {/* Suit Picker Modal */}
      <SuitPicker
        visible={showSuitPicker}
        onSelect={handleSuitSelect}
        onCancel={() => {
          setShowSuitPicker(false);
          setPendingPlay(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d5c0d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  gameArea: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
  buttonWrapper: {
    flexShrink: 0,
  },
  quitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quitButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: '#60a5fa',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    fontSize: 14,
    fontWeight: '600',
  },
  messageContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  pressureWarning: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  lastCardIndicator: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  lastCardText: {
    backgroundColor: '#ffd700',
    color: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
