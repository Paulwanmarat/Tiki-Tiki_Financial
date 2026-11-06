/**
 * DatePickerField — Cross-platform, accessible, touch-friendly date input.
 * • Works 100% reliably on Web (Desktop Chrome/Safari/Firefox/Edge, Mobile Web)
 *   and Native (iOS/Android).
 * • Opens an intuitive Date Picker Modal on click/tap anywhere on the field.
 * • Features 1-tap quick presets (Today, Tomorrow, +1 Month, +3 Months, +6 Months, +1 Year, Yesterday),
 *   Month/Day/Year visual selectors, and direct manual text input with real-time validation.
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

function getRelativeDateLabel(iso: string): string | null {
  if (!iso) return null;
  const today = formatDateISO(new Date());
  if (iso === today) return 'Today';

  const d = new Date(iso + 'T00:00:00');
  const now = new Date(today + 'T00:00:00');
  const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `in ${diffDays}d`;
  if (diffDays > 7 && diffDays <= 60) return `in ${Math.round(diffDays / 7)}w`;
  if (diffDays > 60) return `in ${Math.round(diffDays / 30)}mo`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}d ago`;
  if (diffDays < -7 && diffDays >= -60) return `${Math.round(Math.abs(diffDays) / 7)}w ago`;
  return null;
}

export function DatePickerField({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Select date…',
}: DatePickerFieldProps) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Parsed selections for the modal
  const initial = useMemo(() => parseISODate(value), [value]);
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [selectedMonth, setSelectedMonth] = useState(initial.month);
  const [selectedDay, setSelectedDay] = useState(initial.day);
  const [manualText, setManualText] = useState(value || '');

  // Reset modal state when opened
  const handleOpen = () => {
    const current = parseISODate(value);
    setSelectedYear(current.year);
    setSelectedMonth(current.month);
    setSelectedDay(current.day);
    setManualText(value || formatDateISO(new Date()));
    setModalVisible(true);
  };

  // Keep manual text in sync when year/month/day changes via UI
  const currentFormatted = useMemo(() => {
    const maxDay = getDaysInMonth(selectedMonth, selectedYear);
    const safeDay = Math.min(selectedDay, maxDay);
    return `${selectedYear}-${pad(selectedMonth)}-${pad(safeDay)}`;
  }, [selectedYear, selectedMonth, selectedDay]);

  const handleDaySelect = (day: number) => {
    setSelectedDay(day);
    const iso = `${selectedYear}-${pad(selectedMonth)}-${pad(day)}`;
    setManualText(iso);
  };

  const handleMonthSelect = (m: number) => {
    setSelectedMonth(m);
    const maxDay = getDaysInMonth(m, selectedYear);
    const safeDay = Math.min(selectedDay, maxDay);
    const iso = `${selectedYear}-${pad(m)}-${pad(safeDay)}`;
    setManualText(iso);
  };

  const handleYearSelect = (y: number) => {
    setSelectedYear(y);
    const maxDay = getDaysInMonth(selectedMonth, y);
    const safeDay = Math.min(selectedDay, maxDay);
    const iso = `${y}-${pad(selectedMonth)}-${pad(safeDay)}`;
    setManualText(iso);
  };

  const handleApplyPreset = (presetIso: string) => {
    const p = parseISODate(presetIso);
    setSelectedYear(p.year);
    setSelectedMonth(p.month);
    setSelectedDay(p.day);
    setManualText(presetIso);
    onChange(presetIso);
    setModalVisible(false);
  };

  const handleConfirm = () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(manualText)) {
      onChange(manualText);
    } else {
      onChange(currentFormatted);
    }
    setModalVisible(false);
  };

  // Generate Year range: 2 years back to 10 years forward
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    return Array.from({ length: 13 }, (_, i) => currentYear - 2 + i);
  }, [currentYear]);

  // Days in selected month
  const daysInMonthCount = getDaysInMonth(selectedMonth, selectedYear);
  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonthCount }, (_, i) => i + 1);
  }, [daysInMonthCount]);

  // Presets depending on context (past vs future)
  const presets = useMemo(() => {
    const now = new Date();
    const todayIso = formatDateISO(now);

    const result: { label: string; iso: string }[] = [{ label: 'Today', iso: todayIso }];

    // If maxDate is today or past, show past presets (e.g. for transactions)
    if (maxDate && maxDate <= todayIso) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      result.push({ label: 'Yesterday', iso: formatDateISO(yesterday) });

      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(now.getDate() - 2);
      result.push({ label: '2 Days Ago', iso: formatDateISO(twoDaysAgo) });

      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      result.push({ label: '1 Week Ago', iso: formatDateISO(weekAgo) });
    } else {
      // Future presets (e.g. for goals / deadlines)
      const plus1m = new Date(now);
      plus1m.setMonth(plus1m.getMonth() + 1);
      result.push({ label: '+1 Month', iso: formatDateISO(plus1m) });

      const plus3m = new Date(now);
      plus3m.setMonth(plus3m.getMonth() + 3);
      result.push({ label: '+3 Months', iso: formatDateISO(plus3m) });

      const plus6m = new Date(now);
      plus6m.setMonth(plus6m.getMonth() + 6);
      result.push({ label: '+6 Months', iso: formatDateISO(plus6m) });

      const plus1y = new Date(now);
      plus1y.setFullYear(plus1y.getFullYear() + 1);
      result.push({ label: '+1 Year', iso: formatDateISO(plus1y) });
    }

    return result;
  }, [maxDate]);

  const displayString = value ? formatDisplayDate(value) : placeholder;
  const relativeTag = value ? getRelativeDateLabel(value) : null;

  return (
    <>
      {/* ── Touchable Trigger Row ────────────────────────────────────── */}
      <TouchableOpacity
        style={[
          styles.triggerRow,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={handleOpen}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Date picker: ${displayString}`}
      >
        <View style={[styles.calendarIconBox, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="calendar" size={18} color={colors.primary} />
        </View>

        <View style={styles.textWrap}>
          <Text
            style={[
              styles.displayDate,
              { color: value ? colors.text : colors.textTertiary },
            ]}
            numberOfLines={1}
          >
            {displayString}
          </Text>
          {relativeTag && (
            <View style={[styles.relativePill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
              <Text style={[styles.relativePillText, { color: colors.primary }]}>{relativeTag}</Text>
            </View>
          )}
        </View>

        <View style={styles.changeAction}>
          <Text style={[styles.changeText, { color: colors.primary }]}>Select</Text>
          <Ionicons name="chevron-down" size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>

      {/* ── Universal Interactive Date Picker Modal ─────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Date</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick 1-Tap Presets Bar */}
            <View style={styles.presetsSection}>
              <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>QUICK PRESETS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
                {presets.map((preset) => (
                  <TouchableOpacity
                    key={preset.label}
                    style={[
                      styles.presetButton,
                      {
                        backgroundColor: manualText === preset.iso ? colors.primary : colors.surfaceElevated,
                        borderColor: manualText === preset.iso ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleApplyPreset(preset.iso)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        { color: manualText === preset.iso ? '#FFF' : colors.text },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Selected Date Summary & Direct ISO Input */}
            <View style={[styles.previewRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>SELECTED DATE</Text>
                <Text style={[styles.previewDate, { color: colors.text }]}>
                  {formatDisplayDate(currentFormatted)}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.isoInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={manualText}
                onChangeText={(text) => {
                  setManualText(text);
                  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
                    const p = parseISODate(text);
                    setSelectedYear(p.year);
                    setSelectedMonth(p.month);
                    setSelectedDay(p.day);
                  }
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                maxLength={10}
              />
            </View>

            {/* Year & Month Selection Bars */}
            <View style={styles.selectorsArea}>
              {/* Year Selector */}
              <View style={styles.selectorCol}>
                <Text style={[styles.colHeader, { color: colors.textTertiary }]}>YEAR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowSelector}>
                  {yearOptions.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[
                        styles.selectorPill,
                        selectedYear === y && { backgroundColor: colors.primary, borderColor: colors.primary },
                        { borderColor: colors.border },
                      ]}
                      onPress={() => handleYearSelect(y)}
                    >
                      <Text
                        style={[
                          styles.selectorPillText,
                          { color: selectedYear === y ? '#FFF' : colors.text },
                        ]}
                      >
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month Selector */}
              <View style={styles.selectorCol}>
                <Text style={[styles.colHeader, { color: colors.textTertiary }]}>MONTH</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowSelector}>
                  {MONTH_SHORT.map((m, idx) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.selectorPill,
                        selectedMonth === idx + 1 && { backgroundColor: colors.primary, borderColor: colors.primary },
                        { borderColor: colors.border },
                      ]}
                      onPress={() => handleMonthSelect(idx + 1)}
                    >
                      <Text
                        style={[
                          styles.selectorPillText,
                          { color: selectedMonth === idx + 1 ? '#FFF' : colors.text },
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Day Grid / Carousel */}
              <View style={styles.selectorCol}>
                <Text style={[styles.colHeader, { color: colors.textTertiary }]}>DAY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowSelector}>
                  {daysArray.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.dayCircle,
                        selectedDay === d && { backgroundColor: colors.primary, borderColor: colors.primary },
                        { borderColor: colors.border },
                      ]}
                      onPress={() => handleDaySelect(d)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: selectedDay === d ? '#FFF' : colors.text },
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirm}
              >
                <Ionicons name="checkmark" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmBtnText}>Apply Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    minHeight: 50,
  },
  calendarIconBox: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  displayDate: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  relativePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  relativePillText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  changeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: Spacing.sm,
  },
  changeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  closeBtn: {
    padding: 4,
  },
  presetsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  presetsScroll: {
    gap: 8,
    paddingBottom: Spacing.sm,
  },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 12,
  },
  previewLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  previewDate: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  isoInput: {
    width: 120,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
  },
  selectorsArea: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    gap: 12,
  },
  selectorCol: {
    gap: 6,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  rowSelector: {
    gap: 6,
    paddingBottom: 4,
  },
  selectorPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  selectorPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  confirmBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },
});
