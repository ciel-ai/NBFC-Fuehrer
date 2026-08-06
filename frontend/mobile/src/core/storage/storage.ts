import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * secureStorage — hardware-backed key/value store for sensitive data
 * (auth tokens, MPIN hash/salt/attempts, user PII).
 *
 * Native (iOS/Android): expo-secure-store, which persists into the iOS
 * Keychain and the Android Keystore-backed EncryptedSharedPreferences.
 * Web: no OS keychain exists, so we fall back to localStorage under a
 * `secure_` prefix (best available; browser threat model differs).
 *
 * Legacy plaintext is treated as COMPROMISED, not migrated. Earlier builds
 * wrote these keys as plaintext via AsyncStorage; on a rooted/jailbroken device
 * or a file-system/backup extraction that data (tokens, MPIN hash+salt, PII)
 * was already recoverable. So on first native read we scrub the plaintext copy
 * and return null rather than promoting a possibly-exfiltrated token into the
 * Keychain. Its absence forces a fresh login + MPIN re-setup on upgrade — the
 * only safe response to credentials that may already be in an attacker's hands.
 */
export const secureStorage = {
    async get(key: string): Promise<string | null> {
        try {
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') {
                    return window.localStorage.getItem(`secure_${key}`);
                }
                return null;
            }

            const value = await SecureStore.getItemAsync(key);
            if (value !== null) {
                return value;
            }

            // Pre-SecureStore builds stored this key as plaintext in AsyncStorage.
            // Treat it as compromised: scrub it and return null (do NOT migrate it
            // into the Keychain), forcing a fresh login / MPIN re-setup on upgrade.
            const legacy = await AsyncStorage.getItem(key);
            if (legacy !== null) {
                await AsyncStorage.removeItem(key);
            }
            return null;
        } catch (e) {
            console.error(`[SecureStorage] GET error for key "${key}":`, e);
            return null;
        }
    },

    async set(key: string, value: string): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(`secure_${key}`, value);
                }
                return;
            }
            await SecureStore.setItemAsync(key, value);
        } catch (e) {
            console.error(`[SecureStorage] SET error for key "${key}":`, e);
        }
    },

    async remove(key: string): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem(`secure_${key}`);
                }
                return;
            }
            await SecureStore.deleteItemAsync(key);
            // Also scrub any leftover legacy plaintext copy.
            await AsyncStorage.removeItem(key);
        } catch (e) {
            console.error(`[SecureStorage] REMOVE error for key "${key}":`, e);
        }
    },
};

/**
 * appStorage — non-sensitive UI/state persistence (onboarding flags, cached
 * non-PII data, offline routing keys). Plain AsyncStorage is fine here.
 */
export const appStorage = {
    async get(key: string): Promise<string | null> {
        try {
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') {
                    return window.localStorage.getItem(`app_${key}`);
                }
                return null;
            }
            return await AsyncStorage.getItem(key);
        } catch (e) {
            console.error(`[AppStorage] GET error for key "${key}":`, e);
            return null;
        }
    },

    async set(key: string, value: string): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(`app_${key}`, value);
                }
                return;
            }
            await AsyncStorage.setItem(key, value);
        } catch (e) {
            console.error(`[AppStorage] SET error for key "${key}":`, e);
        }
    },

    async remove(key: string): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem(`app_${key}`);
                }
                return;
            }
            await AsyncStorage.removeItem(key);
        } catch (e) {
            console.error(`[AppStorage] REMOVE error for key "${key}":`, e);
        }
    },
};

export const storage = secureStorage;
