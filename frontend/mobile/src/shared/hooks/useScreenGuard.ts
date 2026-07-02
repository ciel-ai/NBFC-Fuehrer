import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Prevents screenshots and screen recording while the screen is focused.
 * Automatically re-allows capture when the screen loses focus.
 */
export function useScreenGuard() {
  useFocusEffect(
    useCallback(() => {
      ScreenCapture.preventScreenCaptureAsync();

      return () => {
        ScreenCapture.allowScreenCaptureAsync();
      };
    }, [])
  );
}
