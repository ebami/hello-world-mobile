// Lobby screen for creating and joining multiplayer rooms
import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSessionStore } from '../stores';
import { SocketTransport } from '../networking';
import type { RoomInfo } from '../networking/types';

interface LobbyScreenProps {
  readonly onBack: () => void;
  readonly onRoomJoined: (room: RoomInfo, transport: SocketTransport) => void;
}

export default function LobbyScreen({ onBack, onRoomJoined }: LobbyScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [transport, setTransport] = useState<SocketTransport | null>(null);

  const { connectionStatus, error, setConnectionStatus, setError, setPlayerName: savePlayerName } = useSessionStore();

  // Connect to server on mount
  useEffect(() => {
    const socketTransport = new SocketTransport();
    setTransport(socketTransport);

    socketTransport.setCallbacks({
      onConnectionChange: setConnectionStatus,
      onError: setError,
    });

    socketTransport.connect().catch((err) => {
      setError(err.message ?? 'Failed to connect to server');
    });

    return () => {
      socketTransport.disconnect();
    };
  }, [setConnectionStatus, setError]);

  const handleCreateRoom = useCallback(async () => {
    if (!playerName.trim()) {
      Alert.alert('Name Required', 'Please enter your name to create a room.');
      return;
    }

    if (!transport || connectionStatus !== 'connected') {
      Alert.alert('Not Connected', 'Please wait for connection to the server.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const room = await transport.createRoom({
        playerName: playerName.trim(),
        maxPlayers: 4,
      });
      savePlayerName(playerName.trim());
      onRoomJoined(room, transport);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create room';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setIsCreating(false);
    }
  }, [playerName, transport, connectionStatus, savePlayerName, onRoomJoined, setError]);

  const handleJoinRoom = useCallback(async () => {
    if (!playerName.trim()) {
      Alert.alert('Name Required', 'Please enter your name to join a room.');
      return;
    }

    if (!roomCode.trim()) {
      Alert.alert('Room Code Required', 'Please enter the room code to join.');
      return;
    }

    if (!transport || connectionStatus !== 'connected') {
      Alert.alert('Not Connected', 'Please wait for connection to the server.');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const room = await transport.joinRoom({
        roomId: roomCode.trim().toUpperCase(),
        playerName: playerName.trim(),
      });
      savePlayerName(playerName.trim());
      onRoomJoined(room, transport);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join room';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setIsJoining(false);
    }
  }, [playerName, roomCode, transport, connectionStatus, savePlayerName, onRoomJoined, setError]);

  const isLoading = isCreating || isJoining;
  const isConnected = connectionStatus === 'connected';
  
  const getConnectionText = () => {
    if (connectionStatus === 'connecting') return 'Connecting...';
    return isConnected ? 'Connected' : 'Disconnected';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Multiplayer</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Connection Status */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, isConnected ? styles.statusConnected : styles.statusDisconnected]} />
        <Text style={styles.statusText}>
          {getConnectionText()}
        </Text>
      </View>

      {/* Name Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#666"
          value={playerName}
          onChangeText={setPlayerName}
          maxLength={20}
          editable={!isLoading}
        />
      </View>

      {/* Create Room Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create New Room</Text>
        <TouchableOpacity
          style={[styles.button, styles.createButton, (!isConnected || isLoading) && styles.buttonDisabled]}
          onPress={handleCreateRoom}
          disabled={!isConnected || isLoading}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Room</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Join Room Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Join Existing Room</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter room code"
          placeholderTextColor="#666"
          value={roomCode}
          onChangeText={(text) => setRoomCode(text.toUpperCase())}
          maxLength={6}
          autoCapitalize="characters"
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.button, styles.joinButton, (!isConnected || isLoading) && styles.buttonDisabled]}
          onPress={handleJoinRoom}
          disabled={!isConnected || isLoading}
        >
          {isJoining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Join Room</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: '#4ade80',
  },
  statusDisconnected: {
    backgroundColor: '#f87171',
  },
  statusText: {
    color: '#ccc',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 25,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 10,
  },
  createButton: {
    backgroundColor: '#4ade80',
  },
  joinButton: {
    backgroundColor: '#60a5fa',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: '#888',
    paddingHorizontal: 15,
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
  },
});
