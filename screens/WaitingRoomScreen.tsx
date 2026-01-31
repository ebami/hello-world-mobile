// Waiting room screen for pre-game player list and game start
import React, { useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSessionStore } from '../stores';
import type { SocketTransport } from '../networking';
import type { RoomInfo } from '../networking/types';
import type { PlayerSummary, PublicGameView, PrivateHandPayload } from '../game/types';

interface WaitingRoomScreenProps {
  readonly room: RoomInfo;
  readonly transport: SocketTransport;
  readonly onBack: () => void;
  readonly onGameStart: (initialState: PublicGameView, initialHand: PrivateHandPayload) => void;
}

export default function WaitingRoomScreen({
  room,
  transport,
  onBack,
  onGameStart,
}: WaitingRoomScreenProps) {
  const { players, isHost, setRoom, updatePlayers, setError } = useSessionStore();

  // Set up event listeners
  useEffect(() => {
    setRoom(room);

    transport.setCallbacks({
      onRoomUpdated: (updatedRoom) => {
        setRoom(updatedRoom);
        updatePlayers(updatedRoom.players);
      },
      onGameStart: (state, hand) => {
        onGameStart(state, hand);
      },
      onError: (error) => {
        setError(error);
      },
    });
  }, [room, transport, setRoom, updatePlayers, setError, onGameStart]);

  const handleLeaveRoom = useCallback(() => {
    transport.leaveRoom?.();
    onBack();
  }, [transport, onBack]);

  const handleStartGame = useCallback(() => {
    if (players.length < 2) {
      return;
    }
    transport.startGame?.();
  }, [transport, players.length]);

  const handleShareRoom = useCallback(async () => {
    try {
      await Share.share({
        message: `Join my card game! Room code: ${room.roomId}`,
      });
    } catch {
      // User cancelled sharing
    }
  }, [room.roomId]);

  const renderPlayer = ({ item, index }: { item: PlayerSummary; index: number }) => (
    <View style={styles.playerItem}>
      <View style={styles.playerInfo}>
        <View style={[styles.playerIcon, item.isBot && styles.botIcon]}>
          <Text style={styles.playerIconText}>
            {item.isBot ? '🤖' : '👤'}
          </Text>
        </View>
        <View>
          <Text style={styles.playerName}>
            {item.playerId}
            {index === 0 && ' (Host)'}
          </Text>
          <Text style={styles.playerStatus}>
            {item.connected ? '🟢 Connected' : '🔴 Disconnected'}
          </Text>
        </View>
      </View>
    </View>
  );

  const canStart = isHost && players.length >= 2;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeaveRoom} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Waiting Room</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Room Code */}
      <View style={styles.roomCodeContainer}>
        <Text style={styles.roomCodeLabel}>Room Code</Text>
        <View style={styles.roomCodeBox}>
          <Text style={styles.roomCode}>{room.roomId}</Text>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={handleShareRoom}>
          <Text style={styles.shareButtonText}>📤 Share</Text>
        </TouchableOpacity>
      </View>

      {/* Players List */}
      <View style={styles.playersContainer}>
        <Text style={styles.sectionTitle}>
          Players ({players.length}/{room.maxPlayers})
        </Text>
        <FlatList
          data={players}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.playerId}
          style={styles.playersList}
          contentContainerStyle={styles.playersListContent}
        />
      </View>

      {/* Waiting Message or Start Button */}
      <View style={styles.footer}>
        {isHost ? (
          <>
            <TouchableOpacity
              style={[styles.startButton, !canStart && styles.buttonDisabled]}
              onPress={handleStartGame}
              disabled={!canStart}
            >
              <Text style={styles.startButtonText}>
                {players.length < 2 ? 'Waiting for players...' : 'Start Game'}
              </Text>
            </TouchableOpacity>
            {players.length < 2 && (
              <Text style={styles.waitingText}>
                Need at least 2 players to start
              </Text>
            )}
          </>
        ) : (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingTitle}>⏳ Waiting for host...</Text>
            <Text style={styles.waitingText}>
              The host will start the game when everyone is ready.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    color: '#ffd700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 44,
  },
  roomCodeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  roomCodeLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  roomCodeBox: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2,
    borderColor: '#ffd700',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 40,
    marginBottom: 12,
  },
  roomCode: {
    color: '#ffd700',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  shareButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  playersContainer: {
    flex: 1,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  playersList: {
    flex: 1,
  },
  playersListContent: {
    gap: 10,
  },
  playerItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4ade80',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  botIcon: {
    backgroundColor: '#60a5fa',
  },
  playerIconText: {
    fontSize: 20,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playerStatus: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    marginTop: 20,
  },
  startButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#4b5563',
    opacity: 0.7,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  waitingTitle: {
    color: '#ffd700',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  waitingText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
