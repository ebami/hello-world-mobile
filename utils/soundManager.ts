/**
 * @fileoverview Sound manager using expo-audio for audio playback.
 *
 * Provides preloaded sound effects for game actions with graceful
 * fallback when audio is unavailable.
 *
 * @module utils/soundManager
 */

import { createAudioPlayer, AudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

/**
 * Sound effect names.
 */
export const SoundName = {
  cardFlip: 'cardFlip',
  cardPlay: 'cardPlay',
  drawCard: 'drawCard',
  shuffle: 'shuffle',
  win: 'win',
  lose: 'lose',
  buttonTap: 'buttonTap',
  lastCard: 'lastCard',
} as const;

export type SoundEffectName = (typeof SoundName)[keyof typeof SoundName];

/**
 * Sound file mappings.
 * Note: These require actual audio files in assets/sounds/
 * Using require() for static analysis by Metro bundler.
 */
const soundFiles: Record<SoundEffectName, any> = {
  // Placeholder - these will work once actual sound files are added
  // For now, we'll use a fallback approach
  cardFlip: null,
  cardPlay: null,
  drawCard: null,
  shuffle: null,
  win: null,
  lose: null,
  buttonTap: null,
  lastCard: null,
};

/**
 * Cache of loaded audio player objects.
 */
const loadedPlayers: Map<SoundEffectName, AudioPlayer> = new Map();

/**
 * Whether sound is enabled globally.
 */
let soundEnabled = true;

/**
 * Whether sounds have been initialized.
 */
let initialized = false;

/**
 * Initialize the audio system and preload core sounds.
 * Call this early in the app lifecycle (e.g., App.tsx useEffect).
 */
export async function initializeSounds(): Promise<void> {
  if (initialized) return;

  // Skip audio initialization on web
  if (Platform.OS === 'web') {
    initialized = true;
    return;
  }

  try {
    // Configure audio mode for game sounds
    await setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });

    // Preload frequently used sounds
    const coreSounds: SoundEffectName[] = [
      SoundName.cardPlay,
      SoundName.drawCard,
      SoundName.buttonTap,
    ];

    await Promise.all(
      coreSounds.map(async (name) => {
        try {
          loadSound(name);
        } catch (error) {
          console.debug(`Failed to preload sound: ${name}`, error);
        }
      })
    );

    initialized = true;
  } catch (error) {
    console.debug('Sound initialization failed:', error);
  }
}

/**
 * Load a specific sound into memory.
 * @param name - Sound effect name to load
 */
function loadSound(name: SoundEffectName): AudioPlayer | null {
  // Check if already loaded
  const existing = loadedPlayers.get(name);
  if (existing) return existing;

  const file = soundFiles[name];
  if (!file) {
    // No sound file configured - this is expected until assets are added
    return null;
  }

  try {
    const player = createAudioPlayer(file);
    player.volume = 0.7;
    loadedPlayers.set(name, player);
    return player;
  } catch (error) {
    console.debug(`Failed to load sound: ${name}`, error);
    return null;
  }
}

/**
 * Play a sound effect.
 *
 * @param name - Sound effect to play
 *
 * @example
 * ```tsx
 * // Play card play sound
 * await playSound('cardPlay');
 *
 * // Play in event handler (fire and forget)
 * playSound('buttonTap');
 * ```
 */
export async function playSound(name: SoundEffectName): Promise<void> {
  if (!soundEnabled) return;

  // Web platform - skip audio (could use Web Audio API as fallback)
  if (Platform.OS === 'web') {
    return;
  }

  try {
    let player = loadedPlayers.get(name);

    // Lazy load if not preloaded
    player ??= loadSound(name) ?? undefined;

    if (player) {
      // Reset to beginning if already played, then play
      await player.seekTo(0);
      player.play();
    }
  } catch (error) {
    console.debug(`Failed to play sound: ${name}`, error);
  }
}

/**
 * Set global sound enabled state.
 * @param enabled - Whether sounds should play
 */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

/**
 * Check if sound is currently enabled.
 */
export function isSoundEnabled(): boolean {
  return soundEnabled;
}

/**
 * Unload all sounds and free memory.
 * Call this on app cleanup if needed.
 */
export function unloadAllSounds(): void {
  loadedPlayers.forEach((player, name) => {
    try {
      player.remove();
    } catch (error) {
      console.debug(`Failed to unload sound: ${name}`, error);
    }
  });

  loadedPlayers.clear();
  initialized = false;
}

/**
 * Convenience functions for common sounds.
 */
export const playCardFlip = () => playSound(SoundName.cardFlip);
export const playCardPlay = () => playSound(SoundName.cardPlay);
export const playDrawCard = () => playSound(SoundName.drawCard);
export const playShuffle = () => playSound(SoundName.shuffle);
export const playWin = () => playSound(SoundName.win);
export const playLose = () => playSound(SoundName.lose);
export const playButtonTap = () => playSound(SoundName.buttonTap);
export const playLastCard = () => playSound(SoundName.lastCard);

export default {
  initialize: initializeSounds,
  play: playSound,
  setEnabled: setSoundEnabled,
  isEnabled: isSoundEnabled,
  unload: unloadAllSounds,
};
