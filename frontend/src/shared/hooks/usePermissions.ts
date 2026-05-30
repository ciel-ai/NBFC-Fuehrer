import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export interface PermissionStatus {
  camera: 'granted' | 'denied' | 'undetermined';
  notifications: 'granted' | 'denied' | 'undetermined';
  biometric: 'granted' | 'denied' | 'undetermined' | 'unavailable';
}

interface UsePermissionsResult {
  permissions: PermissionStatus;
  requestCamera: () => Promise<void>;
  requestNotifications: () => Promise<void>;
  requestBiometric: () => Promise<void>;
  requestAll: () => Promise<void>;
  isLoading: boolean;
}

export function usePermissions(): UsePermissionsResult {
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);

  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: 'undetermined',
    notifications: 'undetermined',
    biometric: 'undetermined',
  });

  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ================= CAMERA =================
  const requestCamera = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        if (!isMountedRef.current) return;
        setPermissions((p) => ({ ...p, camera: 'granted' }));
        return;
      }

      const CameraModule = await import('expo-camera');

      const existing = await CameraModule.Camera.getCameraPermissionsAsync();

      if (existing.status === 'granted') {
        if (!isMountedRef.current) return;
        setPermissions((p) => ({ ...p, camera: 'granted' }));
        return;
      }

      const { status } =
        await CameraModule.Camera.requestCameraPermissionsAsync();

      if (!isMountedRef.current) return;
      setPermissions((p) => ({
        ...p,
        camera: status === 'granted' ? 'granted' : 'denied',
      }));
    } catch (e) {
      console.log('Camera error:', e);
      if (!isMountedRef.current) return;
      setPermissions((p) => ({ ...p, camera: 'denied' }));
    }
  }, []);

  // ================= NOTIFICATIONS =================
  const requestNotifications = useCallback(async () => {
    try {
      if (isExpoGo) {
        if (!isMountedRef.current) return;
        setPermissions((p) => ({ ...p, notifications: 'granted' }));
        return;
      }

      const Notifications = await import('expo-notifications');

      const existing = await Notifications.getPermissionsAsync();

      if (existing.status === 'granted') {
        if (!isMountedRef.current) return;
        setPermissions((p) => ({ ...p, notifications: 'granted' }));
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();

      if (!isMountedRef.current) return;
      setPermissions((p) => ({
        ...p,
        notifications: status === 'granted' ? 'granted' : 'denied',
      }));
    } catch (e) {
      console.log('Notification error:', e);
      if (!isMountedRef.current) return;
      setPermissions((p) => ({ ...p, notifications: 'denied' }));
    }
  }, [isExpoGo]);

  // ================= BIOMETRIC =================
  const requestBiometric = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        if (!isMountedRef.current) return;
        setPermissions((p) => ({ ...p, biometric: 'unavailable' }));
        return;
      }

      if (!Device.isDevice) {
        if (!isMountedRef.current) return;
        setPermissions((p) => ({ ...p, biometric: 'unavailable' }));
        return;
      }

      const LocalAuth = await import('expo-local-authentication');

      const hasHardware = await LocalAuth.hasHardwareAsync();
      if (!hasHardware) {
        if (!isMountedRef.current) return;
        setPermissions((p) => ({ ...p, biometric: 'unavailable' }));
        return;
      }

      const isEnrolled = await LocalAuth.isEnrolledAsync();
      if (!isEnrolled) {
        if (!isMountedRef.current) return;
        setPermissions((p) => ({ ...p, biometric: 'denied' }));
        return;
      }

      const result = await LocalAuth.authenticateAsync({
        promptMessage: 'Authenticate',
      });

      if (!isMountedRef.current) return;
      setPermissions((p) => ({
        ...p,
        biometric: result.success ? 'granted' : 'denied',
      }));
    } catch (e) {
      console.log('Biometric error:', e);
      if (!isMountedRef.current) return;
      setPermissions((p) => ({ ...p, biometric: 'unavailable' }));
    }
  }, []);

  // ================= ALL =================
  const requestAll = useCallback(async () => {
    setIsLoading(true);

    await Promise.allSettled([
      requestNotifications(),
      // ⚠️ Enable these AFTER testing
      requestCamera(),
      requestBiometric(),
    ]);

    if (isMountedRef.current) {
      setIsLoading(false);
    }
  }, [requestCamera, requestNotifications, requestBiometric]);

  return {
    permissions,
    requestCamera,
    requestNotifications,
    requestBiometric,
    requestAll,
    isLoading,
  };
}

