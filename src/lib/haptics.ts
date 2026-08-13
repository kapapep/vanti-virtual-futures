/** Fires a light haptic tap when running inside a Capacitor shell. */
export async function lightHaptic(): Promise<void> {
  try {
    const cap = (globalThis as unknown as {
      Capacitor?: {
        isNativePlatform?: () => boolean;
        Plugins?: { Haptics?: { impact?: (options: { style: string }) => Promise<void> } };
      };
    }).Capacitor;
    const haptics = cap?.Plugins?.Haptics;
    if (haptics?.impact && cap?.isNativePlatform?.()) {
      await haptics.impact({ style: "LIGHT" });
      return;
    }
    navigator.vibrate?.(10);
  } catch {
    // Haptics are a nice-to-have; ignore failures.
  }
}
