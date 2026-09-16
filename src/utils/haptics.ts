/**
 * Lightweight Haptic Feedback utility using Web Vibration API.
 * Provides subtle tactile feedback on touch devices and Android Capacitor wrappers.
 */
export const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'light'): void => {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'light') {
        navigator.vibrate(8);
      } else if (type === 'medium') {
        navigator.vibrate(15);
      } else if (type === 'success') {
        navigator.vibrate([10, 30, 10]);
      }
    } catch {
      // Haptics gracefully ignored if not supported by hardware/browser policy
    }
  }
};
