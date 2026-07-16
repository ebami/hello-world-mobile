/**
 * @fileoverview Tests for the reconnect-session persistence layer (MFP-04).
 * AsyncStorage is mocked globally in jest.setup.js.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveSession,
  loadSession,
  clearSession,
} from '../../stores/secureTokenStore';

describe('secureTokenStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  const session = { playerId: 'p1', roomId: 'ABC123', reconnectToken: 'tok-1' };

  it('round-trips a saved session', async () => {
    await saveSession(session);
    expect(await loadSession()).toEqual(session);
  });

  it('returns null when nothing is stored', async () => {
    expect(await loadSession()).toBeNull();
  });

  it('clears a stored session', async () => {
    await saveSession(session);
    await clearSession();
    expect(await loadSession()).toBeNull();
  });

  it('returns null for corrupt stored data', async () => {
    await AsyncStorage.setItem('mp.reconnectSession.v1', 'not-json{');
    expect(await loadSession()).toBeNull();
  });

  it('returns null when stored data is missing required fields', async () => {
    await AsyncStorage.setItem(
      'mp.reconnectSession.v1',
      JSON.stringify({ playerId: 'p1' }),
    );
    expect(await loadSession()).toBeNull();
  });
});
