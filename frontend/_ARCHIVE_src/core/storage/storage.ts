import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const secureStorage = {
    async get(key: string): Promise<string | null> {
        try {
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') {
                    return window.localStorage.getItem(`secure_${key}`);
                }
                return null;
            }
            return await AsyncStorage.getItem(key);
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
            await AsyncStorage.setItem(key, value);
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
            await AsyncStorage.removeItem(key);
        } catch (e) {
            console.error(`[SecureStorage] REMOVE error for key "${key}":`, e);
        }
    },
};

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