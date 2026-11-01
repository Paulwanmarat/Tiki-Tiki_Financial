/**
 * DatePickerField — cross-platform date input.
 * • Web: native <input type="date"> rendered via a transparent overlay
 * • Native (iOS/Android): tappable row that opens a scrollable modal picker
 *   with Month / Day / Year columns (no external package required)
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

interface DatePickerFieldProps {
  value: string;           // ISO date string YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string;        // YYYY-MM-DD
  maxDate?: string;        // YYYY-MM-DD
  placeholder?: string;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function pad(n: number) { return String(n).padStart(2, '0'); }

// ─── Web version ──────────────────────────────────────────────────────────────
function WebDateInput({ value, onChange, minDate, maxDate }: DatePickerFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={[webStyles.wrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
      <Text style={[webStyles.label, { color: value ? colors.text : colors.textTertiary }]}>
        {value || 'Select date…'}
      </Text>
      {/* Transparent native input overlaid on top */}
      <input
        type="date"
        value={value}
        min={minDate}
        max={maxDate}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          width: '100%',
          height: '100%',
          cursor: 'pointer',
        } as React.CSSProperties}
      />
    </View>
  );
}

const webStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
    position: 'relative' as any,
    overflow: 'hidden',
  },
  label: { fontSize: FontSize.md, flex: 1 },
});

// ─── Native version ───────────────────────────────────────────────────────────
function NativeDatePicker({ value, onChange, minDate, maxDate }: DatePickerFieldProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  // Parse current value
  const parsed = useMemo(() => {
    const d = value ? new Date(value + 'T00:00:00') : new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }, [value]);

  const [selYear, setSelYear] = useState(parsed.year);
  const [selMonth, setSelMonth] = useState(parsed.month);
  const [selDay, setSelDay] = useState(parsed.day);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 1 + i); // last year → +9 years
  const days = Array.from({ length: daysInMonth(selMonth, selYear) }, (_, i) => i + 1);

  const displayDate = value
    ? `${MONTHS[parsed.month - 1]} ${parsed.day}, ${parsed.year}`
    : 'Select date…';

  const handleConfirm = () => {
    const safeDay = Math.min(selDay, daysInMonth(selMonth, selYear));
    onChange(`${selYear}-${pad(selMonth)}-${pad(safeDay)}`);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[nativeStyles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          setSelYear(parsed.year);
          setSelMonth(parsed.month);
          setSelDay(parsed.day);
          setOpen(true);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={[nativeStyles.triggerText, { color: value ? colors.text : colors.textTertiary }]}>
          {displayDate}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={nativeStyles.backdrop}>
          <View style={[nativeStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Header */}
            <View style={[nativeStyles.sheetHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={[nativeStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[nativeStyles.sheetTitle, { color: colors.text }]}>Select Date</Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={[nativeStyles.doneText, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Columns: Month | Day | Year */}
            <View style={nativeStyles.columns}>
              {/* Month */}
              <ScrollView style={nativeStyles.col} showsVerticalScrollIndicator={false}>
                {MONTHS.map((m, i) => (
                  <TouchableOpacity
                    key={m}
                    style={[nativeStyles.colItem, selMonth === i + 1 && { backgroundColor: colors.primary + '18' }]}
                    onPress={() => setSelMonth(i + 1)}
                  >
                    <Text style={[nativeStyles.colText, { color: selMonth === i + 1 ? colors.primary : colors.text, fontWeight: selMonth === i + 1 ? FontWeight.bold : FontWeight.regular }]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Day */}
              <ScrollView style={nativeStyles.colSmall} showsVerticalScrollIndicator={false}>
                {days.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[nativeStyles.colItem, selDay === d && { backgroundColor: colors.primary + '18' }]}
                    onPress={() => setSelDay(d)}
                  >
                    <Text style={[nativeStyles.colText, { color: selDay === d ? colors.primary : colors.text, fontWeight: selDay === d ? FontWeight.bold : FontWeight.regular }]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Year */}
              <ScrollView style={nativeStyles.colSmall} showsVerticalScrollIndicator={false}>
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[nativeStyles.colItem, selYear === y && { backgroundColor: colors.primary + '18' }]}
                    onPress={() => setSelYear(y)}
                  >
                    <Text style={[nativeStyles.colText, { color: selYear === y ? colors.primary : colors.text, fontWeight: selYear === y ? FontWeight.bold : FontWeight.regular }]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const nativeStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  triggerText: { flex: 1, fontSize: FontSize.md },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '55%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  cancelText: { fontSize: FontSize.md },
  doneText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  columns: { flexDirection: 'row', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  col: { flex: 2 },
  colSmall: { flex: 1 },
  colItem: { paddingVertical: 10, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm, marginVertical: 2 },
  colText: { fontSize: FontSize.md, textAlign: 'center' },
});

// ─── Export ───────────────────────────────────────────────────────────────────
export function DatePickerField(props: DatePickerFieldProps) {
  if (Platform.OS === 'web') return <WebDateInput {...props} />;
  return <NativeDatePicker {...props} />;
}

