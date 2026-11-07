/**
 * DatePickerField — Cross-platform, accessible, touch-friendly date input.
 * Provides intuitive Day, Month, and Year dropdown pickers across Web and Native.
 * Features 1-tap quick presets (Today, Yesterday, +1 Month, etc.) and direct validation.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

export interface DatePickerFieldProps {
  value: string; // ISO date string YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  placeholder?: string;
  label?: string;
}

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day}`;
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function parseISODate(iso: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
  }
  const parts = iso.split('-').map((p) => parseInt(p, 10));
  return { year: parts[0], month: parts[1], day: parts[2] };
}

function formatDisplayDate(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return iso;
  }
  const monthName = MONTH_SHORT[parts[1] - 1] || '';
  return `${monthName} ${parts[2]}, ${parts[0]}`;
}

export function DatePickerField({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Select date…',
  label,
}: DatePickerFieldProps) {
  const { colors, isDark } = useTheme();

  // Active picker modal for native platforms (or quick list)
  const [nativePickerType, setNativePickerType] = useState<'day' | 'month' | 'year' | null>(null);

  const current = useMemo(() => parseISODate(value), [value]);
  const selectedYear = current.year;
  const selectedMonth = current.month;
  const selectedDay = current.day;

  const currentFormatted = useMemo(() => {
    const maxDay = getDaysInMonth(selectedMonth, selectedYear);
    const safeDay = Math.min(selectedDay, maxDay);
    return `${selectedYear}-${pad(selectedMonth)}-${pad(safeDay)}`;
  }, [selectedYear, selectedMonth, selectedDay]);

  const daysInMonthCount = getDaysInMonth(selectedMonth, selectedYear);
  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonthCount }, (_, i) => i + 1);
  }, [daysInMonthCount]);

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => currentYear - 3 + i);
  }, [currentYear]);

  const handleDayChange = (d: number) => {
    const maxDay = getDaysInMonth(selectedMonth, selectedYear);
    const safeDay = Math.min(d, maxDay);
    onChange(`${selectedYear}-${pad(selectedMonth)}-${pad(safeDay)}`);
    setNativePickerType(null);
  };

  const handleMonthChange = (m: number) => {
    const maxDay = getDaysInMonth(m, selectedYear);
    const safeDay = Math.min(selectedDay, maxDay);
    onChange(`${selectedYear}-${pad(m)}-${pad(safeDay)}`);
    setNativePickerType(null);
  };

  const handleYearChange = (y: number) => {
    const maxDay = getDaysInMonth(selectedMonth, y);
    const safeDay = Math.min(selectedDay, maxDay);
    onChange(`${y}-${pad(selectedMonth)}-${pad(safeDay)}`);
    setNativePickerType(null);
  };

  const handleApplyPreset = (presetIso: string) => {
    onChange(presetIso);
  };

  // Presets depending on context (past vs future)
  const presets = useMemo(() => {
    const now = new Date();
    const todayIso = formatDateISO(now);

    const result: { label: string; iso: string }[] = [{ label: 'Today', iso: todayIso }];

    if (maxDate && maxDate <= todayIso) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      result.push({ label: 'Yesterday', iso: formatDateISO(yesterday) });

      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(now.getDate() - 2);
      result.push({ label: '2d ago', iso: formatDateISO(twoDaysAgo) });
    } else {
      const plus1m = new Date(now);
      plus1m.setMonth(plus1m.getMonth() + 1);
      result.push({ label: '+1 Month', iso: formatDateISO(plus1m) });

      const plus3m = new Date(now);
      plus3m.setMonth(plus3m.getMonth() + 3);
      result.push({ label: '+3 Months', iso: formatDateISO(plus3m) });

      const plus6m = new Date(now);
      plus6m.setMonth(plus6m.getMonth() + 6);
      result.push({ label: '+6 Months', iso: formatDateISO(plus6m) });
    }

    return result;
  }, [maxDate]);

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>}

      {/* ── Dropdown Controls Row ──────────────────────────────────── */}
      <View style={styles.dropdownRow}>
        {/* Day Dropdown */}
        <View style={styles.colDay}>
          <Text style={[styles.colSub, { color: colors.textTertiary }]}>DAY</Text>
          {Platform.OS === 'web' ? (
            <select
              value={selectedDay}
              onChange={(e: any) => handleDayChange(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: '8px',
                padding: '9px 10px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {daysArray.map((d) => (
                <option key={d} value={d} style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {pad(d)}
                </option>
              ))}
            </select>
          ) : (
            <TouchableOpacity
              style={[styles.touchBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setNativePickerType('day')}
            >
              <Text style={[styles.touchText, { color: colors.text }]}>{pad(selectedDay)}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Month Dropdown */}
        <View style={styles.colMonth}>
          <Text style={[styles.colSub, { color: colors.textTertiary }]}>MONTH</Text>
          {Platform.OS === 'web' ? (
            <select
              value={selectedMonth}
              onChange={(e: any) => handleMonthChange(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: '8px',
                padding: '9px 10px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {MONTHS_FULL.map((m, idx) => (
                <option key={m} value={idx + 1} style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {m} ({pad(idx + 1)})
                </option>
              ))}
            </select>
          ) : (
            <TouchableOpacity
              style={[styles.touchBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setNativePickerType('month')}
            >
              <Text style={[styles.touchText, { color: colors.text }]}>{MONTH_SHORT[selectedMonth - 1]}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Year Dropdown */}
        <View style={styles.colYear}>
          <Text style={[styles.colSub, { color: colors.textTertiary }]}>YEAR</Text>
          {Platform.OS === 'web' ? (
            <select
              value={selectedYear}
              onChange={(e: any) => handleYearChange(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: '8px',
                padding: '9px 10px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y} style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {y}
                </option>
              ))}
            </select>
          ) : (
            <TouchableOpacity
              style={[styles.touchBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setNativePickerType('year')}
            >
              <Text style={[styles.touchText, { color: colors.text }]}>{selectedYear}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Quick Presets & Preview Bar ────────────────────────────── */}
      <View style={styles.quickBar}>
        <View style={styles.presetButtonsRow}>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.label}
              onPress={() => handleApplyPreset(preset.iso)}
              style={[
                styles.presetPill,
                {
                  backgroundColor: value === preset.iso ? colors.primary + '20' : colors.surfaceElevated,
                  borderColor: value === preset.iso ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.presetPillText,
                  { color: value === preset.iso ? colors.primary : colors.textSecondary },
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.previewSummary}>
          <Ionicons name="calendar-outline" size={13} color={colors.primary} />
          <Text style={[styles.previewDateText, { color: colors.textSecondary }]}>
            {formatDisplayDate(currentFormatted)}
          </Text>
        </View>
      </View>

      {/* ── Native Picker Modal for Mobile Devices ─────────────────── */}
      {nativePickerType && (
        <Modal
          visible={!!nativePickerType}
          transparent
          animationType="fade"
          onRequestClose={() => setNativePickerType(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Select {nativePickerType === 'day' ? 'Day' : nativePickerType === 'month' ? 'Month' : 'Year'}
                </Text>
                <TouchableOpacity onPress={() => setNativePickerType(null)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 300 }}>
                {nativePickerType === 'day' &&
                  daysArray.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.pickerItem,
                        selectedDay === d && { backgroundColor: colors.primary + '18' },
                      ]}
                      onPress={() => handleDayChange(d)}
                    >
                      <Text style={[styles.pickerItemText, { color: selectedDay === d ? colors.primary : colors.text }]}>
                        Day {pad(d)}
                      </Text>
                      {selectedDay === d && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}

                {nativePickerType === 'month' &&
                  MONTHS_FULL.map((m, idx) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.pickerItem,
                        selectedMonth === idx + 1 && { backgroundColor: colors.primary + '18' },
                      ]}
                      onPress={() => handleMonthChange(idx + 1)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          { color: selectedMonth === idx + 1 ? colors.primary : colors.text },
                        ]}
                      >
                        {m} ({pad(idx + 1)})
                      </Text>
                      {selectedMonth === idx + 1 && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}

                {nativePickerType === 'year' &&
                  yearOptions.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[
                        styles.pickerItem,
                        selectedYear === y && { backgroundColor: colors.primary + '18' },
                      ]}
                      onPress={() => handleYearChange(y)}
                    >
                      <Text style={[styles.pickerItemText, { color: selectedYear === y ? colors.primary : colors.text }]}>
                        {y}
                      </Text>
                      {selectedYear === y && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.xs,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  colDay: {
    flex: 1,
  },
  colMonth: {
    flex: 1.6,
  },
  colYear: {
    flex: 1.2,
  },
  colSub: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  touchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  touchText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  quickBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  presetPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  previewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewDateText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
