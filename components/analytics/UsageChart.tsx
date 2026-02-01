import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/theme/colors';
import { TokenUsageDaily } from '@/types';

interface UsageChartProps {
  data: TokenUsageDaily[];
  height?: number;
}

const screenWidth = Dimensions.get('window').width;

export function UsageChart({ data, height = 200 }: UsageChartProps) {
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
  const containerPadding = 32;
  const barGap = 4;
  const availableWidth = screenWidth - containerPadding * 2 - 40; // Account for Y-axis labels
  const barWidth = Math.min(
    24,
    Math.max(8, (availableWidth - barGap * data.length) / data.length),
  );

  return (
    <View style={[styles.container, { height }]}>
      {/* Y-axis labels */}
      <View style={styles.yAxis}>
        <Text style={styles.yAxisLabel}>{formatNumber(maxValue)}</Text>
        <Text style={styles.yAxisLabel}>{formatNumber(maxValue / 2)}</Text>
        <Text style={styles.yAxisLabel}>0</Text>
      </View>

      {/* Chart area */}
      <View style={styles.chartArea}>
        {/* Grid lines */}
        <View style={styles.gridLines}>
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
        </View>

        {/* Bars */}
        <View style={styles.barsContainer}>
          {data.map((item, index) => {
            const inputHeight =
              (Number(item.inputTokens) / maxValue) * (height - 40);
            const outputHeight =
              (Number(item.outputTokens) / maxValue) * (height - 40);

            return (
              <View key={item.date} style={styles.barGroup}>
                <View style={styles.barStack}>
                  {/* Output tokens (top) */}
                  <View
                    style={[
                      styles.bar,
                      styles.barOutput,
                      { width: barWidth, height: outputHeight },
                    ]}
                  />
                  {/* Input tokens (bottom) */}
                  <View
                    style={[
                      styles.bar,
                      styles.barInput,
                      { width: barWidth, height: inputHeight },
                    ]}
                  />
                </View>
                {index % Math.ceil(data.length / 5) === 0 && (
                  <Text style={styles.xAxisLabel}>{formatDate(item.date)}</Text>
                )}
              </View>
            );
          })}
        </View>
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
    padding: 16,
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
    left: 8,
    top: 16,
    bottom: 48,
    justifyContent: 'space-between',
    width: 32,
  },
  yAxisLabel: {
    fontSize: 10,
    color: colors.dark[400],
    textAlign: 'right',
  },
  chartArea: {
    flex: 1,
    marginLeft: 40,
    marginBottom: 24,
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: colors.dark[600],
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  barGroup: {
    alignItems: 'center',
  },
  barStack: {
    alignItems: 'center',
  },
  bar: {
    borderRadius: 2,
  },
  barInput: {
    backgroundColor: colors.primary[500],
  },
  barOutput: {
    backgroundColor: colors.success[500],
    marginBottom: 1,
  },
  xAxisLabel: {
    fontSize: 9,
    color: colors.dark[400],
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.dark[300],
  },
});

export default UsageChart;
