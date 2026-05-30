import React from 'react';
import { Modal, View, Image, Pressable, StyleSheet, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/core/theme/colors';
import { Spacing } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

interface ImageViewerModalProps {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}

export function ImageViewerModal({ visible, uri, onClose }: ImageViewerModalProps) {
  const insets = useSafeAreaInsets();
  // Android with statusBarTranslucent puts the modal under the status bar — pad manually.
  const topPad =
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : insets.top;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      hardwareAccelerated
    >
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Pressable
          style={styles.imageWrap}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close image viewer"
        >
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="contain"
              accessibilityLabel="Document image"
            />
          ) : null}
        </Pressable>
        <Pressable
          onPress={onClose}
          style={[styles.closeBtn, { top: topPad + Spacing.sm }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close image viewer"
        >
          <Ionicons name="close" size={scale(26)} color={Colors.textWhite} />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.md,
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
