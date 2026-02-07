import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { useTutorialStore } from '@/stores/tutorial.store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPOTLIGHT_RADIUS = 36;
const TAB_BAR_HEIGHT = 85;
const TAB_BAR_PADDING_TOP = 8;
const ICON_VERTICAL_OFFSET = 12;
const TAB_COUNT = 4;

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  tabIndex: number | null; // null = centered card, no spotlight
}

const STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to ForkOff!',
    description: "Let's take a quick tour of your mobile command center.",
    tabIndex: null,
  },
  {
    id: 'projects',
    title: 'Your Projects',
    description: 'All coding sessions across connected PCs appear here. Tap any to view or launch a terminal.',
    tabIndex: 0,
  },
  {
    id: 'devices',
    title: 'Your Devices',
    description: 'Monitor and manage your paired workstations. See which are online and ready.',
    tabIndex: 1,
  },
  {
    id: 'analytics',
    title: 'Usage Analytics',
    description: 'Track your Claude token usage, costs, and unlock achievements.',
    tabIndex: 2,
  },
  {
    id: 'settings',
    title: 'Settings & More',
    description: 'Configure preferences, manage your subscription, and refer friends for free PRO months.',
    tabIndex: 3,
  },
  {
    id: 'completion',
    title: "You're all set!",
    description: 'Start by connecting your first device. Happy forking!',
    tabIndex: null,
  },
];

const TAB_ROUTES = [null, '/(tabs)/projects', '/(tabs)/devices', '/(tabs)/analytics', '/(tabs)/settings', null] as const;

function getSpotlightCenter(tabIndex: number) {
  const tabWidth = SCREEN_WIDTH / TAB_COUNT;
  const cx = tabIndex * tabWidth + tabWidth / 2;
  const cy = SCREEN_HEIGHT - TAB_BAR_HEIGHT + TAB_BAR_PADDING_TOP + ICON_VERTICAL_OFFSET;
  return { cx, cy };
}

export function TutorialOverlay() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isTutorialActive, currentStep, nextStep, skipTutorial } = useTutorialStore();

  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const step = STEPS[currentStep];
  const hasSpotlight = step?.tabIndex !== null;

  // Animate card IN
  const animateIn = useCallback(() => {
    cardScale.setValue(0.9);
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardScale, cardOpacity]);

  // Animate card OUT, returns promise
  const animateOut = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      Animated.parallel([
        Animated.timing(cardScale, {
          toValue: 0.9,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => resolve());
    });
  }, [cardScale, cardOpacity]);

  // Start pulsing ring animation
  useEffect(() => {
    if (isTutorialActive && hasSpotlight) {
      pulseAnim.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current = loop;
      loop.start();
      return () => loop.stop();
    } else {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
    }
  }, [isTutorialActive, hasSpotlight, currentStep, pulseAnim]);

  // Animate card in when step changes or tutorial starts
  useEffect(() => {
    if (isTutorialActive) {
      animateIn();
    }
  }, [isTutorialActive, currentStep, animateIn]);

  const handleNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await animateOut();

    const nextStepIndex = currentStep + 1;
    const nextRoute = TAB_ROUTES[nextStepIndex];
    if (nextRoute) {
      router.navigate(nextRoute as any);
    }

    nextStep();
  }, [currentStep, animateOut, nextStep, router]);

  const handleSkip = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await animateOut();
    skipTutorial();
  }, [animateOut, skipTutorial]);

  const handleGetStarted = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await animateOut();
    skipTutorial();
  }, [animateOut, skipTutorial]);

  if (!isTutorialActive || !step) return null;

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.15],
  });

  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  // Render spotlight cutout rects
  const renderSpotlight = () => {
    if (!hasSpotlight || step.tabIndex === null) return null;

    const { cx, cy } = getSpotlightCenter(step.tabIndex);
    const r = SPOTLIGHT_RADIUS;

    return (
      <>
        {/* Top rect */}
        <View
          style={[
            styles.overlayRect,
            {
              top: 0,
              left: 0,
              right: 0,
              height: Math.max(0, cy - r),
              backgroundColor: theme.overlay,
            },
          ]}
          pointerEvents="none"
        />
        {/* Bottom rect */}
        <View
          style={[
            styles.overlayRect,
            {
              top: cy + r,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.overlay,
            },
          ]}
          pointerEvents="none"
        />
        {/* Left rect */}
        <View
          style={[
            styles.overlayRect,
            {
              top: cy - r,
              left: 0,
              width: Math.max(0, cx - r),
              height: r * 2,
              backgroundColor: theme.overlay,
            },
          ]}
          pointerEvents="none"
        />
        {/* Right rect */}
        <View
          style={[
            styles.overlayRect,
            {
              top: cy - r,
              left: cx + r,
              right: 0,
              height: r * 2,
              backgroundColor: theme.overlay,
            },
          ]}
          pointerEvents="none"
        />

        {/* Pulsing ring */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              left: cx - r,
              top: cy - r,
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              borderColor: theme.primary,
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
          pointerEvents="none"
        />
      </>
    );
  };

  // Render full-screen overlay for centered steps
  const renderFullOverlay = () => {
    if (hasSpotlight) return null;
    return (
      <View
        style={[styles.fullOverlay, { backgroundColor: theme.overlay }]}
        pointerEvents="none"
      />
    );
  };

  // Render step dots
  const renderStepDots = () => (
    <View style={styles.dotsContainer}>
      {STEPS.map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === currentStep
              ? { width: 20, backgroundColor: theme.primary }
              : { width: 6, backgroundColor: theme.textTertiary + '60' },
          ]}
        />
      ))}
    </View>
  );

  // Render tooltip card
  const renderTooltipCard = () => {
    const isCentered = !hasSpotlight;

    // Position: centered steps are in the middle of the screen
    // Tab steps: positioned above the tab bar
    const cardStyle: any = isCentered
      ? { alignSelf: 'center', marginTop: SCREEN_HEIGHT * 0.3 }
      : { alignSelf: 'center', position: 'absolute' as const, bottom: TAB_BAR_HEIGHT + 20 };

    return (
      <Animated.View
        style={[
          styles.tooltipCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            transform: [{ scale: cardScale }],
            opacity: cardOpacity,
          },
          cardStyle,
        ]}
      >
        {/* Icon for centered steps */}
        {isCentered && (
          <View style={[styles.centeredIcon, { backgroundColor: theme.primaryBackground }]}>
            {isFirstStep ? (
              <Sparkles size={28} color={theme.primary} />
            ) : (
              <CheckCircle size={28} color={theme.primary} />
            )}
          </View>
        )}

        {/* Down-pointing arrow for tab spotlight steps */}
        {!isCentered && step.tabIndex !== null && (
          <View
            style={[
              styles.arrowContainer,
              { left: getSpotlightCenter(step.tabIndex).cx - 10 - (SCREEN_WIDTH - 340) / 2 },
            ]}
          >
            <View style={[styles.arrowDown, { borderTopColor: theme.card }]} />
          </View>
        )}

        <Text style={[styles.tooltipTitle, { color: theme.text }]}>{step.title}</Text>
        <Text style={[styles.tooltipDescription, { color: theme.textSecondary }]}>{step.description}</Text>

        {renderStepDots()}

        {/* Button row */}
        {isLastStep ? (
          <TouchableOpacity
            style={[styles.primaryButton, styles.fullWidthButton, { backgroundColor: theme.primary }]}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
              <Text style={[styles.skipText, { color: theme.textTertiary }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {isFirstStep ? "Let's go!" : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <Modal
      visible={isTutorialActive}
      transparent
      animationType="none"
      onRequestClose={handleSkip}
    >
      <View style={styles.container}>
        {renderFullOverlay()}
        {renderSpotlight()}
        {renderTooltipCard()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlayRect: {
    position: 'absolute',
  },
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  tooltipCard: {
    marginHorizontal: (SCREEN_WIDTH - 340) / 2,
    maxWidth: 340,
    width: 340,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  centeredIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  arrowContainer: {
    position: 'absolute',
    bottom: -10,
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  tooltipDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: {
    width: '100%',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TutorialOverlay;
