import { logger } from '@/src/core/logger/logger';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

export interface PermissionStatus {
  camera: 'granted' | 'denied' | 'undetermined';
  biometric: 'granted' | 'denied' | 'undetermined' | 'unavailable';
}

interface UsePermissionsResult {
  permissions: PermissionStatus;
  requestCamera: () => Promise<void>;
  requestBiometric: () => Promise<void>;
  requestAll: () => Promise<void>;
  isLoading: boolean;
}

export function usePermissions(): UsePermissionsResult {
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);

  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: 'undetermined',
    biometric: 'undetermined',
  });

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
      logger.error('Camera permission error', e);
      if (!isMountedRef.current) return;
      setPermissions((p) => ({ ...p, camera: 'denied' }));
    }
  }, []);

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
      logger.error('Biometric check error', e);
      if (!isMountedRef.current) return;
      setPermissions((p) => ({ ...p, biometric: 'unavailable' }));
    }
  }, []);

  // ================= ALL =================
  const requestAll = useCallback(async () => {
    setIsLoading(true);

    await Promise.allSettled([requestCamera(), requestBiometric()]);

    if (isMountedRef.current) {
      setIsLoading(false);
    }
  }, [requestCamera, requestBiometric]);

  return {
    permissions,
    requestCamera,
    requestBiometric,
    requestAll,
    isLoading,
  };
}
