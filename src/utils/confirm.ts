import { Platform, Alert } from 'react-native';

/**
 * Universal cross-platform confirmation dialog:
 * - On Web: uses window.confirm (since Alert.alert button callbacks do not trigger in React Native Web)
 * - On iOS/Android: uses native Alert.alert with cancel and destructive actions
 */
export function confirmAction(
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void | Promise<void>,
  destructive = false
): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const text = `${title.toUpperCase()}\n\n${message}`;
    const confirmed = window.confirm(text);
    if (confirmed) {
      void onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => void onConfirm(),
      },
    ]);
  }
}
