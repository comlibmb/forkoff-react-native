import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  ClipPath,
  Rect,
  G,
  Path,
  Line,
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme, ThemeColors } from '@/theme/ThemeProvider';
import { TokenUsageDaily } from '@/types';
import { buildMonotonePath, buildAreaPath, formatAxisLabel, formatDateLabel, Point } from './chartUtils';

interface WaveAreaChartProps {
  data: TokenUsageDaily[];
  height?: number;
  theme?: ThemeColors;
}

const PADDING = { top: 12, right: 12, bottom: 32, left: 44 };
const LEGEND_HEIGHT = 36;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export function WaveAreaChart({ data, height = 260, theme: themeProp }: WaveAreaChartProps) {
  const { theme: contextTheme } = useTheme();
  const theme = themeProp || contextTheme;

  const screenWidth = Dimensions.get('window').width;
  const svgWidth = screenWidth - 32; // 16px padding on each side from parent
  const chartWidth = svgWidth - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom - LEGEND_HEIGHT;

  // Animation values
  const clipAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [clipWidth, setClipWidth] = useState(0);

  // Entrance animation: clip reveal left to right
  useEffect(() => {
    if (data.length === 0) return;

    clipAnim.setValue(0);
    setClipWidth(0);

    const listener = clipAnim.addListener(({ value }) => {
      setClipWidth(value * chartWidth);
    });

    Animated.timing(clipAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => clipAnim.removeListener(listener);
  }, [data, chartWidth, clipAnim]);

  // Glow pulse animation
  useEffect(() => {
    if (data.length === 0) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [data, glowAnim]);

  // Glow opacity tracked via state for SVG
  const [glowOpacity, setGlowOpacity] = useState(0.3);
  useEffect(() => {
    const listener = glowAnim.addListener(({ value }) => setGlowOpacity(value));
    return () => glowAnim.removeListener(listener);
  }, [glowAnim]);

  // Tooltip show/hide
  useEffect(() => {
    Animated.timing(tooltipOpacity, {
      toValue: selectedIndex !== null ? 1 : 0,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [selectedIndex, tooltipOpacity]);

  // Compute data points
  const { inputPoints, outputPoints, maxValue, gridLines } = useMemo(() => {
    if (data.length === 0) return { inputPoints: [], outputPoints: [], maxValue: 0, gridLines: [] };

    const maxVal = Math.max(
      ...data.map(d => Math.max(Number(d.inputTokens), Number(d.outputTokens))),
      1,
    );
    // Round up to a nice number
    const niceMax = getNiceMax(maxVal);

    const inp: Point[] = data.map((d, i) => ({
      x: PADDING.left + (data.length === 1 ? chartWidth / 2 : (i / (data.length - 1)) * chartWidth),
      y: PADDING.top + chartHeight - (Number(d.inputTokens) / niceMax) * chartHeight,
    }));

    const out: Point[] = data.map((d, i) => ({
      x: PADDING.left + (data.length === 1 ? chartWidth / 2 : (i / (data.length - 1)) * chartWidth),
      y: PADDING.top + chartHeight - (Number(d.outputTokens) / niceMax) * chartHeight,
    }));

    const lines = [0, 0.25, 0.5, 0.75, 1].map(frac => ({
      y: PADDING.top + chartHeight - frac * chartHeight,
      label: formatAxisLabel(frac * niceMax),
    }));

    return { inputPoints: inp, outputPoints: out, maxValue: niceMax, gridLines: lines };
  }, [data, chartWidth, chartHeight]);

  // X-axis labels (show ~5-6 labels max)
  const xLabels = useMemo(() => {
    if (data.length === 0) return [];
    const step = Math.max(1, Math.ceil(data.length / 6));
    return data
      .map((d, i) => ({ index: i, label: formatDateLabel(d.date) }))
      .filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [data]);

  // Touch handler
  const handlePress = useCallback(
    (evt: { nativeEvent: { locationX: number } }) => {
      if (data.length === 0) return;
      const touchX = evt.nativeEvent.locationX - PADDING.left;
      const idx = Math.round((touchX / chartWidth) * (data.length - 1));
      const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));

      setSelectedIndex(prev => (prev === clampedIdx ? null : clampedIdx));
    },
    [data, chartWidth],
  );

  const handleDismiss = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  // Paths
  const bottomY = PADDING.top + chartHeight;
  const inputAreaPath = useMemo(() => buildAreaPath(inputPoints, bottomY), [inputPoints, bottomY]);
  const outputAreaPath = useMemo(() => buildAreaPath(outputPoints, bottomY), [outputPoints, bottomY]);
  const inputEdgePath = useMemo(() => buildMonotonePath(inputPoints), [inputPoints]);
  const outputEdgePath = useMemo(() => buildMonotonePath(outputPoints), [outputPoints]);

  if (data.length === 0) {
    return (
      <View style={[styles.container, { height, backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No usage data yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Start using Claude to see your usage trends
          </Text>
        </View>
      </View>
    );
  }

  const selectedItem = selectedIndex !== null ? data[selectedIndex] : null;
  const selectedX = selectedIndex !== null
    ? PADDING.left + (data.length === 1 ? chartWidth / 2 : (selectedIndex / (data.length - 1)) * chartWidth)
    : 0;

  // Position tooltip: flip to left side if too close to right edge
  const tooltipWidth = 160;
  const tooltipLeft = selectedX + tooltipWidth + 16 > svgWidth
    ? selectedX - tooltipWidth - 8
    : selectedX + 8;

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      {/* Tooltip */}
      {selectedItem && (
        <Animated.View
          style={[
            styles.tooltip,
            {
              opacity: tooltipOpacity,
              left: tooltipLeft,
              top: 4,
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.tooltipDate, { color: theme.text }]}>
            {formatDateLabel(selectedItem.date)}
          </Text>
          <View style={styles.tooltipRow}>
            <View style={[styles.tooltipDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.tooltipLabel, { color: theme.textSecondary }]}>Input</Text>
            <Text style={[styles.tooltipValue, { color: theme.text }]}>
              {formatAxisLabel(Number(selectedItem.inputTokens))}
            </Text>
          </View>
          <View style={styles.tooltipRow}>
            <View style={[styles.tooltipDot, { backgroundColor: theme.success }]} />
            <Text style={[styles.tooltipLabel, { color: theme.textSecondary }]}>Output</Text>
            <Text style={[styles.tooltipValue, { color: theme.text }]}>
              {formatAxisLabel(Number(selectedItem.outputTokens))}
            </Text>
          </View>
          <View style={[styles.tooltipDivider, { backgroundColor: theme.divider }]} />
          <View style={styles.tooltipRow}>
            <Text style={[styles.tooltipLabel, { color: theme.textSecondary }]}>Total</Text>
            <Text style={[styles.tooltipValue, { color: theme.text }]}>
              {formatAxisLabel(Number(selectedItem.totalTokens))}
            </Text>
          </View>
        </Animated.View>
      )}

      <Svg width={svgWidth} height={height - LEGEND_HEIGHT} viewBox={`0 0 ${svgWidth} ${height - LEGEND_HEIGHT}`}>
        <Defs>
          {/* Input (violet) gradient */}
          <LinearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.primary} stopOpacity="0.4" />
            <Stop offset="1" stopColor={theme.primary} stopOpacity="0" />
          </LinearGradient>
          {/* Output (green) gradient */}
          <LinearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.success} stopOpacity="0.35" />
            <Stop offset="1" stopColor={theme.success} stopOpacity="0" />
          </LinearGradient>
          {/* Clip path for entrance animation */}
          <ClipPath id="chartClip">
            <Rect x={PADDING.left} y={0} width={clipWidth} height={height} />
          </ClipPath>
        </Defs>

        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <Line
            key={i}
            x1={PADDING.left}
            y1={line.y}
            x2={svgWidth - PADDING.right}
            y2={line.y}
            stroke={theme.border}
            strokeWidth={0.5}
            strokeDasharray={i > 0 && i < gridLines.length - 1 ? '4,4' : undefined}
          />
        ))}

        {/* Y-axis labels */}
        {gridLines.map((line, i) => (
          <SvgText
            key={`y-${i}`}
            x={PADDING.left - 6}
            y={line.y + 3}
            fontSize={10}
            fill={theme.textSecondary}
            textAnchor="end"
          >
            {line.label}
          </SvgText>
        ))}

        {/* Animated chart content */}
        <G clipPath="url(#chartClip)">
          {/* Output area (behind) */}
          <Path d={outputAreaPath} fill="url(#outputGrad)" />
          {/* Input area (in front) */}
          <Path d={inputAreaPath} fill="url(#inputGrad)" />

          {/* Output edge glow */}
          <Path
            d={outputEdgePath}
            fill="none"
            stroke={theme.success}
            strokeWidth={3}
            opacity={glowOpacity * 0.5}
          />
          {/* Output edge */}
          <Path d={outputEdgePath} fill="none" stroke={theme.success} strokeWidth={1.5} opacity={0.9} />

          {/* Input edge glow */}
          <Path
            d={inputEdgePath}
            fill="none"
            stroke={theme.primary}
            strokeWidth={3}
            opacity={glowOpacity * 0.5}
          />
          {/* Input edge */}
          <Path d={inputEdgePath} fill="none" stroke={theme.primary} strokeWidth={1.5} opacity={0.9} />
        </G>

        {/* Touch overlay */}
        <Rect
          x={PADDING.left}
          y={PADDING.top}
          width={chartWidth}
          height={chartHeight}
          fill="transparent"
          onPress={handlePress}
          onPressIn={handlePress}
        />

        {/* Selected point indicator */}
        {selectedIndex !== null && (
          <>
            <Line
              x1={selectedX}
              y1={PADDING.top}
              x2={selectedX}
              y2={bottomY}
              stroke={theme.textTertiary}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <Circle
              cx={selectedX}
              cy={inputPoints[selectedIndex]?.y}
              r={4}
              fill={theme.primary}
              stroke={theme.card}
              strokeWidth={2}
            />
            <Circle
              cx={selectedX}
              cy={outputPoints[selectedIndex]?.y}
              r={4}
              fill={theme.success}
              stroke={theme.card}
              strokeWidth={2}
            />
          </>
        )}

        {/* X-axis date labels */}
        {xLabels.map(({ index, label }) => {
          const x = PADDING.left + (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
          return (
            <SvgText
              key={`x-${index}`}
              x={x}
              y={bottomY + 16}
              fontSize={9}
              fill={theme.textSecondary}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.legendText, { color: theme.textTertiary }]}>Input</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
          <Text style={[styles.legendText, { color: theme.textTertiary }]}>Output</Text>
        </View>
      </View>
    </View>
  );
}

/** Round up to a "nice" number for the chart axis max */
function getNiceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  let nice: number;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 260,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    height: LEGEND_HEIGHT,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tooltip: {
    position: 'absolute',
    zIndex: 10,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    width: 160,
  },
  tooltipDate: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  tooltipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  tooltipLabel: {
    fontSize: 11,
    flex: 1,
  },
  tooltipValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  tooltipDivider: {
    height: 1,
    marginVertical: 4,
  },
});

export default WaveAreaChart;
