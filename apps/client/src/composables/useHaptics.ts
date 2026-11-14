// Safe haptic feedback composable for mobile browsers
export function useHaptics() {
  const isSupported = (): boolean => {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  };

  const vibrate = (pattern: number | number[] = 10) => {
    try {
      if (isSupported()) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // Ignore browsers that block or don't support vibrate
    }
  };

  const light = () => vibrate(10);
  const medium = () => vibrate(25);
  const success = () => vibrate([15, 40, 25]);
  const warning = () => vibrate([35, 50, 35]);

  return {
    isSupported,
    vibrate,
    light,
    medium,
    success,
    warning,
  };
}
