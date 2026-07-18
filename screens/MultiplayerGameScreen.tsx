// Multiplayer game screen using transport-agnostic interface
import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Card as CardType, Suit, PublicGameView, PrivateHandPayload, SeatStatus, Standing } from '../game/types';
import { getValidMoves } from '../game';
import { PlayerArea, DiscardPile, ActionButtons, SuitPicker, GameOverOverlay, ConfirmDialog, Toast, type ToastVariant } from '../components';
import type { GameTransport, ConnectionStatus } from '../networking/types';

/**
 * A compact opponent seat for 3-4 player games: name, hidden hand count, a
 * turn highlight, and a status badge distinguishing an active opponent from one
 * who has finished, been dropped, or is mid-reconnect (R14-R16).
 */
function OpponentSeat({
  name,
  handCount,
  isCurrentTurn,
  status,
  connected,
}: {
  readonly name: string;
  readonly handCount: number;
  readonly isCurrentTurn: boolean;
  readonly status?: SeatStatus;
  readonly connected: boolean;
}) {
  const badge =
    status === 'finished'
      ? '🏁 Finished'
      : status === 'eliminated'
        ? '🚪 Left'
        : !connected
          ? '📵 Reconnecting'
          : null;
  const dimmed = status === 'eliminated';
  return (
    <View
      style={[
        styles.oppSeat,
        isCurrentTurn && styles.oppSeatActive,
        dimmed && styles.oppSeatDimmed,
      ]}
    >
      <Text style={styles.oppAvatar}>{status === 'eliminated' ? '🚪' : '👤'}</Text>
      <Text style={styles.oppName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.oppCount}>{handCount} cards</Text>
      {badge && <Text style={styles.oppBadge}>{badge}</Text>}
    </View>
  );
}

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
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);
  const [pendingPlay, setPendingPlay] = useState<CardType[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Win/lose screen. winner: 0 = you, 1 = opponent, null = draw (matches
  // GameOverOverlay's convention). `forfeit` is true when the opponent left an
  // active game. Driven by the server's game_over event.
  const [gameOver, setGameOver] = useState<{
    visible: boolean;
    winner: number | null;
    forfeit: boolean;
    standings: Standing[];
  }>({
    visible: false,
    winner: null,
    forfeit: false,
    standings: [],
  });
  // Default 'connected' since this screen is only mounted after a live session.
  // A transport drop moves this to 'connecting' until session resume succeeds,
  // gating gameplay so we never act on an unresumed connection (MFP-04).
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const isConnected = connectionStatus === 'connected';

  // Find current player index
  const myPlayerId = initialHand.playerId;
  const myPlayerIndex = gameState.players.findIndex(p => p.playerId === myPlayerId);
  const isPlayerTurn = gameState.currentPlayer === myPlayerIndex;
  const topCard = gameState.discardPile.at(-1);

  // Get valid moves for current player
  const validMoves = useMemo(() => {
    if (!topCard) return { singles: [], runs: [] };
    // Honour the active suit after an Ace (the server re-validates, but this
    // keeps client hints correct instead of matching the Ace's physical suit).
    return getValidMoves(hand, topCard, gameState.drawPressure, gameState.activeSuit ?? null);
  }, [hand, topCard, gameState.drawPressure, gameState.activeSuit]);

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

  // Resolve the finishing order (from game_over) to display rows at render time,
  // so names come from current state rather than a stale callback closure.
  const playersById = useMemo(() => {
    const map: Record<string, string> = {};
    gameState.players.forEach((p) => {
      map[p.playerId] = p.isBot ? 'Bot' : p.displayName;
    });
    return map;
  }, [gameState.players]);

  const standingRows = useMemo(
    () =>
      gameOver.standings.map((s) => ({
        place: s.place,
        name: playersById[s.playerId] ?? 'Player',
        isYou: s.playerId === myPlayerId,
        outcome: s.outcome,
      })),
    [gameOver.standings, playersById, myPlayerId],
  );

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
      onGameOver: (winnerId, _message, reason, standings) => {
        // Map the server's winner id to GameOverOverlay's convention
        // (0 = you, 1 = opponent, null = draw). `reason` distinguishes a forfeit
        // from a natural win; `standings` carries the 3-4 player finishing order.
        const winner = winnerId === null ? null : winnerId === myPlayerId ? 0 : 1;
        setGameOver({ visible: true, winner, forfeit: reason === 'forfeit', standings: standings ?? [] });
      },
      onPlayerLeft: (_playerId, displayName) => {
        setToast({ message: `${displayName} left the game.`, variant: 'info' });
      },
      onError: (error) => {
        setToast({ message: error, variant: 'error' });
        setIsProcessing(false);
      },
      // Gate gameplay on transport/session state (MFP-04): a reconnect reports
      // 'connecting' until resume succeeds, then 'connected'.
      onConnectionChange: setConnectionStatus,
    });
  }, [transport, myPlayerId]);

  const handleCardPress = useCallback((card: CardType) => {
    if (!isPlayerTurn || isProcessing || !isConnected) return;

    setSelectedCards((prev) =>
      prev.some((c) => c.id === card.id)
        ? prev.filter((c) => c.id !== card.id)
        : [...prev, card]
    );
  }, [isPlayerTurn, isProcessing, isConnected]);

  const handlePlay = useCallback(() => {
    if (selectedCards.length === 0 || !isPlayerTurn || isProcessing || !isConnected) return;

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
      setToast({ message: 'Those cards cannot be played together.', variant: 'error' });
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
  }, [selectedCards, isPlayerTurn, isProcessing, isConnected, validMoves, transport]);

  const handleSuitSelect = useCallback((suit: Suit) => {
    if (!pendingPlay) return;

    // Do NOT mutate the Ace's physical suit. Send the choice as `declaredSuit`
    // so the server keeps the canonical card and records the active suit
    // separately (the forged-suit vector this story closes).
    setIsProcessing(true);
    transport.sendAction({ type: 'PLAY_CARDS', cards: pendingPlay, declaredSuit: suit });
    setSelectedCards([]);
    setPendingPlay(null);
    setShowSuitPicker(false);
  }, [pendingPlay, transport]);

  const canDraw = useMemo(
    () => gameState.deckCount > 0 || gameState.discardPile.length > 1,
    [gameState.deckCount, gameState.discardPile.length]
  );

  const handleDraw = useCallback(() => {
    if (!isPlayerTurn || isProcessing || !canDraw || !isConnected) return;
    setIsProcessing(true);
    transport.sendAction({ type: 'DRAW_CARD' });
    setSelectedCards([]);
  }, [isPlayerTurn, isProcessing, canDraw, isConnected, transport]);

  const handleDeclareLastCard = useCallback(() => {
    if (!canDeclareLastCard) return;
    transport.sendAction({ type: 'DECLARE_LAST_CARD', player: myPlayerIndex });
  }, [canDeclareLastCard, transport, myPlayerIndex]);

  const handleQuit = useCallback(() => {
    // In-app confirmation (ConfirmDialog) rather than Alert.alert, which is a
    // no-op on react-native-web — an Alert-based confirm never appears on web,
    // so the quit button would do nothing there.
    setShowQuitConfirm(true);
  }, []);

  const handleConfirmQuit = useCallback(() => {
    setShowQuitConfirm(false);
    transport.disconnect();
    onBack();
  }, [transport, onBack]);

  // All opponents in seat order (presentation order matches the frozen seat
  // order during a game), each tagged with their seat index for turn detection.
  const opponents = gameState.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.playerId !== myPlayerId);

  // In Ranking mode a player who has gone out keeps watching until the match
  // ends; show an interim banner instead of a frozen board (R6).
  const iFinishedWaiting =
    gameState.players[myPlayerIndex]?.status === 'finished' && !gameOver.visible;

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

      {/* Reconnecting banner: shown while the transport is recovering the
          session; gameplay input is disabled until resume succeeds (MFP-04). */}
      {!isConnected && (
        <View style={styles.reconnectingBanner}>
          <Text style={styles.reconnectingText}>Reconnecting…</Text>
        </View>
      )}

      {iFinishedWaiting && (
        <View style={styles.finishedBanner}>
          <Text style={styles.finishedBannerText}>
            🏁 You finished — waiting for the match to end
          </Text>
        </View>
      )}

      {/* Status Message */}
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>{gameState.message}</Text>
        {gameState.drawPressure > 0 && (
          <Text style={styles.pressureWarning}>
            ⚠️ Draw pressure: +{gameState.drawPressure} cards
          </Text>
        )}
        {gameState.activeSuit && (
          <Text style={styles.messageText}>Suit in force: {gameState.activeSuit}</Text>
        )}
      </View>

      {/* Game Area */}
      <View style={styles.gameArea}>
        {/* Opponent Area — a single opponent renders as today (2-player); 2-3
            opponents render as a row of compact seats around the top (R13-R16). */}
        {opponents.length === 1 ? (
          <PlayerArea
            name={opponents[0].player.isBot ? '🤖 Bot' : `👤 ${opponents[0].player.displayName}`}
            cards={Array.from({ length: opponents[0].player.handCount }, (_, i) => ({ id: `hidden-${i}`, rank: 'A' as const, suit: '♠' as const }))}
            isCurrentTurn={gameState.currentPlayer === opponents[0].index}
            faceDown
            score={opponents[0].player.handCount}
            isOpponent
          />
        ) : (
          <View style={styles.opponentsRow}>
            {opponents.map(({ player, index }) => (
              <OpponentSeat
                key={player.playerId}
                name={player.isBot ? '🤖 Bot' : player.displayName}
                handCount={player.handCount}
                isCurrentTurn={gameState.currentPlayer === index}
                status={player.status}
                connected={player.connected}
              />
            ))}
          </View>
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
          canDraw={canDraw}
          canPlay={selectedCards.length > 0}
          canDeclareLastCard={canDeclareLastCard}
          isPlayerTurn={isPlayerTurn && !isProcessing && isConnected}
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

      {/* Game Over Overlay — win/lose screen. onPlayAgain is undefined in
          multiplayer (no local rematch), so only Main Menu is shown. */}
      <GameOverOverlay
        visible={gameOver.visible}
        winner={gameOver.winner}
        forfeit={gameOver.forfeit}
        standings={standingRows}
        onPlayAgain={onPlayAgain}
        onMainMenu={onBack}
      />

      {/* Quit confirmation */}
      <ConfirmDialog
        visible={showQuitConfirm}
        title="Quit Game?"
        message="Are you sure you want to quit? You will leave the game."
        confirmLabel="Quit"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleConfirmQuit}
        onCancel={() => setShowQuitConfirm(false)}
      />

      {/* Transient notifications (invalid move, server errors) */}
      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant}
        onHide={() => setToast(null)}
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
  opponentsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  oppSeat: {
    minWidth: 88,
    maxWidth: 120,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  oppSeatActive: {
    borderColor: '#ffd700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  oppSeatDimmed: {
    opacity: 0.5,
  },
  oppAvatar: {
    fontSize: 22,
  },
  oppName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 104,
  },
  oppCount: {
    color: '#cfd3db',
    fontSize: 12,
    marginTop: 2,
  },
  oppBadge: {
    color: '#ffd700',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
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
  reconnectingBanner: {
    backgroundColor: '#f59e0b',
    paddingVertical: 6,
    alignItems: 'center',
  },
  reconnectingText: {
    color: '#1a1a2e',
    fontSize: 14,
    fontWeight: 'bold',
  },
  finishedBanner: {
    backgroundColor: '#2563eb',
    paddingVertical: 6,
    alignItems: 'center',
  },
  finishedBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
