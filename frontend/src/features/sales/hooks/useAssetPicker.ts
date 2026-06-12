import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// ---------------------------------------------------------------------------
// Camera / library capture with built-in compression.
//
// `quality: 0.5` performs the image compression the spec calls for at capture
// time (expo-image-picker re-encodes the JPEG at the requested quality), so we
// avoid pulling in a separate image-manipulation dependency. Documents are
// captured as images (photo/scan of the document) since the project does not
// bundle a document-picker module.
// ---------------------------------------------------------------------------

const COMPRESSION_QUALITY = 0.5;

export type AssetSource = 'camera' | 'library' | 'document';

export function useAssetPicker() {
  const [busy, setBusy] = useState(false);

  const ensureCameraPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera permission needed',
        'Enable camera access in Settings to capture photos.',
      );
      return false;
    }
    return true;
  }, []);

  const ensureLibraryPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photos permission needed',
        'Enable photo-library access in Settings to upload files.',
      );
      return false;
    }
    return true;
  }, []);

  /** Returns a local file URI for the captured/selected asset, or null. */
  const pick = useCallback(
    async (source: AssetSource): Promise<string | null> => {
      setBusy(true);
      try {
        let result: ImagePicker.ImagePickerResult;
        if (source === 'camera') {
          if (!(await ensureCameraPermission())) return null;
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: COMPRESSION_QUALITY,
            allowsEditing: true,
          });
        } else {
          if (!(await ensureLibraryPermission())) return null;
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: COMPRESSION_QUALITY,
            allowsEditing: source === 'document',
          });
        }

        if (result.canceled || !result.assets?.length) return null;
        return result.assets[0].uri;
      } catch {
        Alert.alert('Could not access the file. Please try again.');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [ensureCameraPermission, ensureLibraryPermission],
  );

  return { pick, busy };
}
