import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, LayoutChangeEvent, ViewStyle, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';

interface SkeletonLoaderProps {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({ width, height, borderRadius = 8, style }: SkeletonLoaderProps) {
  const { theme } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    setMeasuredWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    if (measuredWidth === 0) return;

    translateX.setValue(-measuredWidth);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: measuredWidth,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [measuredWidth, translateX]);

  return (
    <View
      onLayout={handleLayout}
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.skeleton,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {measuredWidth > 0 && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateX }] },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.06)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}
