/**
 * @fileoverview Haptic feedback utility for touch interactions.
 *
 * Provides consistent haptic feedback across the app with graceful
 * fallback when haptics are unavailable (e.g., web platform).
 *
 * @module utils/haptics
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Check if haptics are supported on the current platform.
 */
const isHapticsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Haptic feedback types mapped to user actions.
 */
export const HapticType = {
  /** Light tap for button presses */
  buttonPress: 'buttonPress',
  /** Selection feedback for toggles */
  selection: 'selection',
  /** Medium impact for confirmed actions */
  cardPlayed: 'cardPlayed',
  /** Light impact for drawing cards */
  drawCard: 'drawCard',
  /** Success notification for wins */
  gameWin: 'gameWin',
  /** Error notification for losses */
  gameLoss: 'gameLoss',
  /** Warning for invalid moves */
  invalidMove: 'invalidMove',
} as const;

export type HapticFeedbackType = (typeof HapticType)[keyof typeof HapticType];

/**
 * Trigger haptic feedback for a specific action type.
 *
 * @param type - The type of haptic feedback to trigger
 *
 * @example
 * ```tsx
 * // In a button press handler
 * onPress={() => {
 *   triggerHaptic('buttonPress');
 *   // ... button action
 * }}
 * ```
 */
export async function triggerHaptic(type: HapticFeedbackType): Promise<void> {
  if (!isHapticsSupported) return;

  try {
    switch (type) {
      case HapticType.buttonPress:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;

      case HapticType.selection:
        await Haptics.selectionAsync();
        break;

      case HapticType.cardPlayed:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;

      case HapticType.drawCard:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;

      case HapticType.gameWin:
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;

      case HapticType.gameLoss:
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;

      case HapticType.invalidMove:
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;

      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (error) {
    // Silently fail - haptics are non-essential
    console.debug('Haptic feedback unavailable:', error);
  }
}

/**
 * Hook-friendly wrapper for button press haptics.
 * Use this for quick inline haptic feedback.
 */
export const hapticButtonPress = () => triggerHaptic(HapticType.buttonPress);
export const hapticSelection = () => triggerHaptic(HapticType.selection);
export const hapticCardPlayed = () => triggerHaptic(HapticType.cardPlayed);
export const hapticDrawCard = () => triggerHaptic(HapticType.drawCard);
export const hapticGameWin = () => triggerHaptic(HapticType.gameWin);
export const hapticGameLoss = () => triggerHaptic(HapticType.gameLoss);
export const hapticInvalidMove = () => triggerHaptic(HapticType.invalidMove);

export default triggerHaptic;
