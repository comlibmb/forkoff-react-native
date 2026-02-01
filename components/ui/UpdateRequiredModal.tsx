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
import { colors } from '@/theme/colors';
import { useVersionStore } from '@/stores/version.store';

interface UpdateRequiredModalProps {
  visible: boolean;
}

export function UpdateRequiredModal({ visible }: UpdateRequiredModalProps) {
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
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/app/forkoff/id123456789', // Replace with actual App Store ID
      android: 'https://play.google.com/store/apps/details?id=com.forkoff.app',
      default: 'https://forkoff.dev',
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
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* macOS-style title bar */}
          <View style={styles.titleBar}>
            <View style={[styles.dot, { backgroundColor: colors.error[400] }]} />
            <View style={[styles.dot, { backgroundColor: colors.warning[300] }]} />
            <View style={[styles.dot, { backgroundColor: colors.success[300] }]} />
            <Text style={styles.titleBarText}>forkoff</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <ArrowUpCircle size={48} color={colors.primary[400]} />
            </View>

            {/* Title */}
            <Text style={styles.title}>Update Required</Text>

            {/* Message */}
            <Text style={styles.message}>{updateMessage}</Text>

            {/* Version info */}
            <View style={styles.versionInfo}>
              <Text style={styles.versionLabel}>Current version:</Text>
              <Text style={styles.versionValue}>{currentVersion}</Text>
            </View>
            {versionConfig && (
              <View style={styles.versionInfo}>
                <Text style={styles.versionLabel}>Required version:</Text>
                <Text style={styles.versionValue}>{versionConfig.minVersion}+</Text>
              </View>
            )}

            {/* Update button */}
            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleOpenStore}
              activeOpacity={0.8}
            >
              <Text style={styles.updateButtonText}>Update Now</Text>
              <ExternalLink size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom accent bar */}
          <View style={styles.accentBar} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  container: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: colors.dark[800],
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark[600],
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.dark[700],
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[600],
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  titleBarText: {
    fontSize: 12,
    color: colors.dark[300],
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
    backgroundColor: colors.dark[700],
    borderWidth: 2,
    borderColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.dark[50],
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: colors.dark[200],
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
    backgroundColor: colors.dark[700],
    borderRadius: 8,
    marginBottom: 8,
  },
  versionLabel: {
    fontSize: 13,
    color: colors.dark[300],
  },
  versionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark[100],
    fontFamily: 'monospace',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary[600],
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
    backgroundColor: colors.primary[500],
  },
});

export default UpdateRequiredModal;
