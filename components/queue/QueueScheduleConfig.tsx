import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
} from 'react-native';
import { Clock, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme, ThemeColors } from '@/theme/ThemeProvider';
import { QueueSchedule } from '@/types';

interface QueueScheduleConfigProps {
  schedule: QueueSchedule | null;
  onUpdate: (data: Partial<QueueSchedule>) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'S', full: 'Sunday' },
  { value: 1, label: 'M', full: 'Monday' },
  { value: 2, label: 'T', full: 'Tuesday' },
  { value: 3, label: 'W', full: 'Wednesday' },
  { value: 4, label: 'T', full: 'Thursday' },
  { value: 5, label: 'F', full: 'Friday' },
  { value: 6, label: 'S', full: 'Saturday' },
];

export function QueueScheduleConfig({ schedule, onUpdate }: QueueScheduleConfigProps) {
  const { theme } = useTheme();
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Parse current time
  const parseTime = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // Format time for display
  const formatTime = (timeStr: string): string => {
    const date = parseTime(timeStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const currentTime = schedule?.scheduledTime || '09:00';
  const enabled = schedule?.enabled || false;
  const selectedDays = schedule?.daysOfWeek || [];

  const handleToggle = (value: boolean) => {
    onUpdate({ enabled: value });
  };

  const handleTimeChange = (_: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      onUpdate({ scheduledTime: `${hours}:${minutes}` });
    }
  };

  const toggleDay = (day: number) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day].sort();
    onUpdate({ daysOfWeek: newDays });
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {/* Enable toggle */}
      <View style={styles.row}>
        <View style={styles.rowContent}>
          <View style={styles.iconContainer}>
            <Clock size={20} color={theme.primaryLight} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Scheduled Execution</Text>
            <Text style={styles.subtitle}>
              Automatically execute queued prompts at a set time
            </Text>
          </View>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{
            false: theme.switchTrackOff,
            true: theme.primary,
          }}
          thumbColor={enabled ? '#fff' : theme.switchThumb}
        />
      </View>

      {enabled && (
        <>
          {/* Time picker */}
          <TouchableOpacity
            style={styles.timePicker}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.timeLabel}>Execution Time</Text>
            <Text style={styles.timeValue}>{formatTime(currentTime)}</Text>
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={parseTime(currentTime)}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              textColor={theme.text}
            />
          )}

          {/* Days of week */}
          <View style={styles.daysContainer}>
            <View style={styles.daysHeader}>
              <Calendar size={16} color={theme.textTertiary} />
              <Text style={styles.daysLabel}>
                {selectedDays.length === 0 ? 'Every day' : 'Selected days'}
              </Text>
            </View>
            <View style={styles.daysRow}>
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day.value}
                  style={[
                    styles.dayButton,
                    selectedDays.includes(day.value) && styles.dayButtonSelected,
                  ]}
                  onPress={() => toggleDay(day.value)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selectedDays.includes(day.value) && styles.dayTextSelected,
                    ]}
                  >
                    {day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.daysHint}>
              Leave all unchecked to run every day
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    rowContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.primaryBackground,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    timePicker: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.cardBorder,
    },
    timeLabel: {
      fontSize: 14,
      color: theme.textTertiary,
    },
    timeValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primaryLight,
    },
    daysContainer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.cardBorder,
    },
    daysHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    daysLabel: {
      fontSize: 13,
      color: theme.textTertiary,
    },
    daysRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    dayButton: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 8,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: 40,
    },
    dayButtonSelected: {
      backgroundColor: theme.primary,
    },
    dayText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textTertiary,
    },
    dayTextSelected: {
      color: '#fff',
    },
    daysHint: {
      fontSize: 11,
      color: theme.border,
      marginTop: 8,
      textAlign: 'center',
    },
  });

export default QueueScheduleConfig;
