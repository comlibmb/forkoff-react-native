import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  Easing,
  Linking,
  Platform,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { ArrowUpCircle, ExternalLink } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useVersionStore } from '@/stores/version.store';

interface UpdateRequiredModalProps {
  visible: boolean;
}

export function UpdateRequiredModal({ visible }: UpdateRequiredModalProps) {
  const { theme } = useTheme();
  const { updateMessage, currentVersion, versionConfig } = useVersionStore();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleOpenStore = () => {
    const iosAppId = process.env.EXPO_PUBLIC_IOS_APP_STORE_ID;
    const storeUrl = Platform.select({
      ios: iosAppId
        ? `https://apps.apple.com/app/forkoff/id${iosAppId}`
        : 'https://apps.apple.com/app/forkoff',
      android: 'https://play.google.com/store/apps/details?id=app.forkoff',
      default: 'https://forkoff.app',
    });

    if (storeUrl) {
      Linking.openURL(storeUrl);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* macOS-style title bar */}
          <View style={[styles.titleBar, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
            <View style={[styles.dot, { backgroundColor: theme.error }]} />
            <View style={[styles.dot, { backgroundColor: theme.warning }]} />
            <View style={[styles.dot, { backgroundColor: theme.success }]} />
            <Text style={[styles.titleBarText, { color: theme.textTertiary }]}>forkoff</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary }]}>
              <ArrowUpCircle size={48} color={theme.primary} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: theme.text }]}>Update Required</Text>

            {/* Message */}
            <Text style={[styles.message, { color: theme.textSecondary }]}>{updateMessage}</Text>

            {/* Version info */}
            <View style={[styles.versionInfo, { backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[styles.versionLabel, { color: theme.textTertiary }]}>Current version:</Text>
              <Text style={[styles.versionValue, { color: theme.text }]}>{currentVersion}</Text>
            </View>
            {versionConfig && (
              <View style={[styles.versionInfo, { backgroundColor: theme.backgroundSecondary }]}>
                <Text style={[styles.versionLabel, { color: theme.textTertiary }]}>Required version:</Text>
                <Text style={[styles.versionValue, { color: theme.text }]}>{versionConfig.minVersion}+</Text>
              </View>
            )}

            {/* Update button */}
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: theme.primary }]}
              onPress={handleOpenStore}
              activeOpacity={0.8}
            >
              <Text style={styles.updateButtonText}>Update Now</Text>
              <ExternalLink size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom accent bar */}
          <View style={[styles.accentBar, { backgroundColor: theme.primary }]} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 360,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  titleBarText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginLeft: 8,
  },
  content: {
    padding: 28,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  versionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  versionLabel: {
    fontSize: 13,
  },
  versionValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginTop: 20,
    width: '100%',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  accentBar: {
    height: 4,
  },
});

export default UpdateRequiredModal;
