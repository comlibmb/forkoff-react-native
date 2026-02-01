import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { colors } from '@/theme/colors';
import { TokenUsageDaily } from '@/types';

interface UsageChartProps {
  data: TokenUsageDaily[];
  height?: number;
}

const screenWidth = Dimensions.get('window').width;

// Layout constants
const CONTAINER_PADDING = 16;
const Y_AXIS_WIDTH = 40;
const LEGEND_HEIGHT = 32;
const X_AXIS_HEIGHT = 20;

export function UsageChart({ data, height = 220 }: UsageChartProps) {
  // Calculate available chart height
  const chartHeight = height - CONTAINER_PADDING * 2 - LEGEND_HEIGHT - X_AXIS_HEIGHT;

  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No usage data yet</Text>
          <Text style={styles.emptySubtext}>Start using Claude to see your usage trends</Text>
        </View>
      </View>
    );
  }

  // Calculate max value for scaling
  const maxValue = Math.max(
    ...data.map((d) => Number(d.inputTokens) + Number(d.outputTokens)),
    1,
  );

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Format date for label
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate bar width based on data length
  const chartWidth = screenWidth - CONTAINER_PADDING * 2 - Y_AXIS_WIDTH - 16; // 16 for scroll padding
  const minBarWidth = 12;
  const maxBarWidth = 28;
  const barGap = 6;
  const barWidth = Math.min(
    maxBarWidth,
    Math.max(minBarWidth, (chartWidth - barGap * (data.length - 1)) / data.length),
  );

  // Check if we need horizontal scrolling
  const totalBarsWidth = data.length * barWidth + (data.length - 1) * barGap;
  const needsScroll = totalBarsWidth > chartWidth;

  return (
    <View style={[styles.container, { height }]}>
      {/* Y-axis labels */}
      <View style={[styles.yAxis, { height: chartHeight }]}>
        <Text style={styles.yAxisLabel}>{formatNumber(maxValue)}</Text>
        <Text style={styles.yAxisLabel}>{formatNumber(maxValue / 2)}</Text>
        <Text style={styles.yAxisLabel}>0</Text>
      </View>

      {/* Chart area */}
      <View style={styles.chartWrapper}>
        {/* Grid lines */}
        <View style={[styles.gridLines, { height: chartHeight }]}>
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
        </View>

        {/* Scrollable bars area */}
        <ScrollView
          horizontal={needsScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.barsScrollContent,
            !needsScroll && styles.barsNoScroll,
          ]}
          style={[styles.barsScrollView, { height: chartHeight + X_AXIS_HEIGHT }]}
        >
          <View style={styles.barsContainer}>
            {data.map((item, index) => {
              const total = Number(item.inputTokens) + Number(item.outputTokens);
              const inputRatio = total > 0 ? Number(item.inputTokens) / maxValue : 0;
              const outputRatio = total > 0 ? Number(item.outputTokens) / maxValue : 0;
              const inputHeight = Math.max(0, inputRatio * chartHeight);
              const outputHeight = Math.max(0, outputRatio * chartHeight);
              const showLabel = data.length <= 7 || index % Math.ceil(data.length / 6) === 0;

              return (
                <View key={item.date} style={[styles.barGroup, { marginRight: index < data.length - 1 ? barGap : 0 }]}>
                  <View style={[styles.barStack, { height: chartHeight }]}>
                    <View style={styles.barStackInner}>
                      {/* Output tokens (top) */}
                      {outputHeight > 0 && (
                        <View
                          style={[
                            styles.bar,
                            styles.barOutput,
                            { width: barWidth, height: outputHeight },
                          ]}
                        />
                      )}
                      {/* Input tokens (bottom) */}
                      {inputHeight > 0 && (
                        <View
                          style={[
                            styles.bar,
                            styles.barInput,
                            { width: barWidth, height: inputHeight },
                          ]}
                        />
                      )}
                    </View>
                  </View>
                  {/* X-axis label */}
                  <View style={styles.xAxisLabelContainer}>
                    {showLabel && (
                      <Text style={styles.xAxisLabel} numberOfLines={1}>
                        {formatDate(item.date)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary[500] }]} />
          <Text style={styles.legendText}>Input</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success[500] }]} />
          <Text style={styles.legendText}>Output</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark[600],
    padding: CONTAINER_PADDING,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark[300],
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.dark[400],
  },
  yAxis: {
    position: 'absolute',
    left: CONTAINER_PADDING,
    top: CONTAINER_PADDING,
    width: Y_AXIS_WIDTH - 8,
    justifyContent: 'space-between',
  },
  yAxisLabel: {
    fontSize: 10,
    color: colors.dark[400],
    textAlign: 'right',
  },
  chartWrapper: {
    flex: 1,
    marginLeft: Y_AXIS_WIDTH,
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: colors.dark[600],
  },
  barsScrollView: {
    overflow: 'hidden',
  },
  barsScrollContent: {
    paddingRight: 8,
  },
  barsNoScroll: {
    flex: 1,
    justifyContent: 'space-around',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
  },
  barGroup: {
    alignItems: 'center',
  },
  barStack: {
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barStackInner: {
    alignItems: 'center',
  },
  bar: {
    borderRadius: 3,
  },
  barInput: {
    backgroundColor: colors.primary[500],
  },
  barOutput: {
    backgroundColor: colors.success[500],
    marginBottom: 2,
  },
  xAxisLabelContainer: {
    height: X_AXIS_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  xAxisLabel: {
    fontSize: 9,
    color: colors.dark[400],
    textAlign: 'center',
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
    color: colors.dark[300],
    fontWeight: '500',
  },
});

export default UsageChart;
