import { Linking, Alert } from 'react-native';

/**
 * Open the system dialer for a phone number.
 *
 * Why: tel: URLs fail silently on tablets / emulators without a dialer app,
 * and unsanitised numbers (with spaces, dashes, +91 prefix) get rejected on
 * some Android OEM dialers. This wrapper sanitises and surfaces a friendly
 * Alert instead of failing quietly.
 */
export async function dialPhone(phone: string): Promise<boolean> {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) {
    Alert.alert('Invalid number', 'No phone number to call.');
    return false;
  }
  const url = `tel:${cleaned}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Cannot place call', 'This device cannot open the phone dialer.');
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Call failed', 'Could not open the phone dialer.');
    return false;
  }
}
