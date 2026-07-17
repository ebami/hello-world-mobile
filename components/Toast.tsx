import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type ToastVariant = 'error' | 'info' | 'success';

interface ToastProps {
  /** The message to show. When `null`, nothing renders. */
  readonly message: string | null;
  readonly variant?: ToastVariant;
  /** Auto-dismiss delay in ms. */
  readonly duration?: number;
  /** Called when the auto-dismiss timer elapses. */
  readonly onHide: () => void;
}

/**
 * Transient, cross-platform notification banner. Used instead of `Alert.alert`
 * for non-blocking notices (validation, errors) — react-native-web silently
 * ignores `Alert`, so those messages never appear on web.
 */
export default function Toast({ message, variant = 'info', duration = 3000, onHide }: ToastProps) {
  // Keep the latest onHide without restarting the timer on every parent render.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => onHideRef.current(), duration);
    return () => clearTimeout(id);
  }, [message, duration]);

  if (!message) return null;

  const variantStyle =
    variant === 'error' ? styles.error : variant === 'success' ? styles.success : styles.info;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.toast, variantStyle]} accessibilityRole="alert">
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  toast: {
    maxWidth: 420,
    marginHorizontal: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  error: {
    backgroundColor: '#e63946',
  },
  info: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  success: {
    backgroundColor: '#2a9d3f',
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
