import React, { useReducer, useEffect, useMemo, useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Card as CardType, GameState, Suit } from '../game/types';
import {
  generateDeck,
  shuffleDeck,
  dealCards,
  getValidMoves,
  applyCardEffect,
  drawCards,
  isGameOver,
  declareLastCard,
} from '../game';
import { getComputerMove, getBotTurnDelay, type Difficulty } from '../game/ai';
import { PlayerArea, DiscardPile, ActionButtons, SuitPicker } from '../components';

interface GameScreenProps {
  readonly difficulty: Difficulty;
  readonly onBack: () => void;
  readonly onPlayAgain: () => void;
}

// Game actions
type GameAction =
  | { type: 'INITIALIZE' }
  | { type: 'PLAY_CARDS'; cards: CardType[] }
  | { type: 'DRAW_CARD' }
  | { type: 'DECLARE_LAST_CARD'; player: number }
  | { type: 'SET_MESSAGE'; message: string };

function createInitialState(): GameState {
  const deck = shuffleDeck(generateDeck());
  const { hands, remaining } = dealCards(deck, 2, 5);
  const discardPile = [remaining.shift()!];
  
  return {
    deck: remaining,
    discardPile,
    players: hands,
    currentPlayer: 0,
    direction: 1,
    message: 'Game started! Your turn.',
    lastCardCalled: [false, false],
    drawPressure: 0,
    hasPlayed: [false, false],
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INITIALIZE':
      return createInitialState();

    case 'PLAY_CARDS':
      return applyCardEffect(state, action.cards);

    case 'DRAW_CARD': {
      const count = state.drawPressure > 0 ? state.drawPressure : 1;
      const { deck, discardPile, drawn } = drawCards(
        state.deck,
        state.discardPile,
        count
      );
      const players = state.players.map((hand, idx) =>
        idx === state.currentPlayer ? [...hand, ...drawn] : hand
      );
      const hasPlayed = [...state.hasPlayed];
      hasPlayed[state.currentPlayer] = true;
      const lastCardCalled = [...state.lastCardCalled];
      lastCardCalled[state.currentPlayer] = false;

      const nextPlayer =
        (state.currentPlayer + state.direction + players.length) % players.length;

      return {
        ...state,
        deck,
        discardPile,
        players,
        currentPlayer: nextPlayer,
        message: `Drew ${drawn.length} card${drawn.length === 1 ? '' : 's'}`,
        drawPressure: 0,
        hasPlayed,
        lastCardCalled,
      };
    }

    case 'DECLARE_LAST_CARD':
      return declareLastCard(state, action.player);

    case 'SET_MESSAGE':
      return { ...state, message: action.message };

    default:
      return state;
  }
}

export default function GameScreen({ difficulty, onBack, onPlayAgain }: GameScreenProps) {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [pendingPlay, setPendingPlay] = useState<CardType[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const playerHand = state.players[0];
  const opponentHand = state.players[1];
  const topCard = state.discardPile.at(-1);
  const isPlayerTurn = state.currentPlayer === 0;
  const gameOver = isGameOver(state);

  // Get valid moves for current player
  const validMoves = useMemo(() => {
    if (!topCard) return { singles: [], runs: [] };
    return getValidMoves(playerHand, topCard, state.drawPressure);
  }, [playerHand, topCard, state.drawPressure]);

  // Check if player can declare last card
  const canDeclareLastCard = useMemo(() => {
    if (state.currentPlayer === 0) return false;
    if (!state.hasPlayed.every(Boolean)) return false;
    if (playerHand.length === 0) return false;
    if (state.lastCardCalled[0]) return false;
    
    const { singles, runs } = validMoves;
    return playerHand.length === 1
      ? singles.some((c) => c.id === playerHand[0]?.id)
      : runs.some((run) => run.length === playerHand.length);
  }, [state, playerHand, validMoves]);

  // AI turn logic
  useEffect(() => {
    if (gameOver.over || isPlayerTurn || isProcessing) return;

    const timer = setTimeout(() => {
      setIsProcessing(true);
      const move = getComputerMove(state, difficulty);
      
      if (move.draw) {
        dispatch({ type: 'DRAW_CARD' });
      } else if (move.cards) {
        dispatch({ type: 'PLAY_CARDS', cards: move.cards });
      }
      setIsProcessing(false);
    }, getBotTurnDelay(difficulty));

    return () => clearTimeout(timer);
  }, [state.currentPlayer, gameOver.over, isPlayerTurn, isProcessing, difficulty, state]);

  // Handle game over
  useEffect(() => {
    if (gameOver.over) {
      let message = "🤝 It's a draw!";
      if (gameOver.winner === 0) {
        message = '🎉 Congratulations! You Win!';
      } else if (gameOver.winner === 1) {
        message = '😔 Bot Wins! Better luck next time.';
      }
      
      Alert.alert(
        'Game Over',
        message,
        [
          { text: 'Play Again', onPress: onPlayAgain },
          { text: 'Main Menu', onPress: onBack },
        ]
      );
    }
  }, [gameOver.over, gameOver.winner, onBack, onPlayAgain]);

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

    dispatch({ type: 'PLAY_CARDS', cards: selectedCards });
    setSelectedCards([]);
  }, [selectedCards, isPlayerTurn, isProcessing, validMoves]);

  const handleSuitSelect = useCallback((suit: Suit) => {
    if (!pendingPlay) return;
    
    const modifiedCards = pendingPlay.map((card, idx) =>
      idx === pendingPlay.length - 1 ? { ...card, suit } : card
    );
    
    dispatch({ type: 'PLAY_CARDS', cards: modifiedCards });
    setSelectedCards([]);
    setPendingPlay(null);
    setShowSuitPicker(false);
  }, [pendingPlay]);

  const handleDraw = useCallback(() => {
    if (!isPlayerTurn || isProcessing || state.deck.length === 0) return;
    dispatch({ type: 'DRAW_CARD' });
    setSelectedCards([]);
  }, [isPlayerTurn, isProcessing, state.deck.length]);

  const handleDeclareLastCard = useCallback(() => {
    if (!canDeclareLastCard) return;
    dispatch({ type: 'DECLARE_LAST_CARD', player: 0 });
  }, [canDeclareLastCard]);

  const handleQuit = useCallback(() => {
    Alert.alert(
      'Quit Game?',
      'Are you sure you want to quit? Progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Quit', style: 'destructive', onPress: onBack },
      ]
    );
  }, [onBack]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleQuit} style={styles.quitButton}>
          <Text style={styles.quitButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.difficultyBadge}>🤖 {difficulty.toUpperCase()}</Text>
        </View>
      </View>

      {/* Status Message */}
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>{state.message}</Text>
        {state.drawPressure > 0 && (
          <Text style={styles.pressureWarning}>
            ⚠️ Draw pressure: +{state.drawPressure} cards
          </Text>
        )}
      </View>

      {/* Game Area - flexible middle section */}
      <View style={styles.gameArea}>
        {/* Opponent Area */}
        <PlayerArea
          name="🤖 Bot"
          cards={opponentHand}
          isCurrentTurn={state.currentPlayer === 1}
          faceDown
          score={opponentHand.length}
          isOpponent
        />

        {/* Discard Pile & Deck */}
        <DiscardPile
          topCard={topCard}
          deckCount={state.deck.length}
          drawPressure={state.drawPressure}
        />

        {/* Player Area */}
        <PlayerArea
          name="👤 You"
          cards={playerHand}
          selectedCards={selectedCards}
          onCardPress={handleCardPress}
          isCurrentTurn={isPlayerTurn}
          score={playerHand.length}
        />
      </View>

      {/* Action Buttons - fixed at bottom */}
      <View style={styles.buttonWrapper}>
        <ActionButtons
          onDraw={handleDraw}
          onPlay={handlePlay}
          onDeclareLastCard={handleDeclareLastCard}
          canDraw={state.deck.length > 0}
          canPlay={selectedCards.length > 0}
          canDeclareLastCard={canDeclareLastCard}
          isPlayerTurn={isPlayerTurn && !isProcessing}
        />
      </View>

      {/* Last Card Indicator */}
      {state.lastCardCalled[0] && (
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
    justifyContent: 'space-between',
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
  difficultyBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: '#ffd700',
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
