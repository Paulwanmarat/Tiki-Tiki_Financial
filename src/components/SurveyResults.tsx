import surveyData from '@/constants/surveyData.json';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const C = {
  bg: '#F8FAFC',
  white: '#FFFFFF',
  dark: '#0F172A',
  slate700: '#334155',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  primary: Colors.light.primary,
  success: Colors.light.success,
  warning: Colors.light.warning,
};

/* ─── helpers ──────────────────────────────────────────────────── */
function sortedEntries(obj: Record<string, number>): [string, number][] {
  return Object.entries(obj).sort((a, b) => (b[1] as number) - (a[1] as number));
}

function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

/* ─── chart colours ────────────────────────────────────────────── */
const BAR_COLORS = [C.primary, '#0EA5E9', '#8B5CF6', '#EC4899', C.success, C.warning, '#F97316'];

/* ─── main component ──────────────────────────────────────────── */
export function SurveyResults() {
  const windowWidth = Dimensions.get('window').width;
  const isMobile = windowWidth < 768;

  const total = surveyData.totalResponses;
  const ages = surveyData.distributions.ages as Record<string, number>;
  const spending = surveyData.distributions.spendMoneyOn as Record<string, number>;
  const features = surveyData.distributions.mostUsefulFeature as Record<string, number>;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>RESEARCH</Text>
      <Text style={[styles.heading, isMobile && { fontSize: 28, lineHeight: 36 }]}>
        What students told us
      </Text>
      <Text style={styles.desc}>
        The team surveyed classmates and people at school aged 14–21. The survey was shared through school group chats and social media to understand real money management habits.
      </Text>

      {/* Summary stat cards */}
      <View style={[styles.statsRow, isMobile && styles.statsRowMobile]}>
        <StatCard value={total.toString()} label="Survey Respondents" icon="people-outline" color={C.primary} />
      </View>

      {/* Charts */}
      <View style={[styles.chartsGrid, isMobile && styles.chartsGridMobile]}>
        {/* Age Demographics */}
        <ChartCard
          title="Age Demographics"
          icon="school-outline"
          entries={sortedEntries(ages)}
          total={total}
          colorIndex={0}
          isMobile={isMobile}
        />

        {/* Top Spending */}
        <ChartCard
          title="Top Spending Categories"
          icon="cart-outline"
          entries={sortedEntries(spending).slice(0, 5)}
          total={total}
          colorIndex={1}
          isMobile={isMobile}
          cleanLabel={cleanSpendLabel}
        />

        {/* Requested Features */}
        <ChartCard
          title="Most Requested Features"
          icon="star-outline"
          entries={sortedEntries(features)}
          total={total}
          colorIndex={2}
          isMobile={isMobile}
          cleanLabel={cleanFeatureLabel}
        />
      </View>
    </View>
  );
}

/* ─── stat card ────────────────────────────────────────────────── */
function StatCard({ value, label, icon, color }: { value: string; label: string; icon: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ─── chart card ───────────────────────────────────────────────── */
function ChartCard({
  title,
  icon,
  entries,
  total,
  colorIndex,
  isMobile,
  cleanLabel,
}: {
  title: string;
  icon: string;
  entries: [string, number][];
  total: number;
  colorIndex: number;
  isMobile: boolean;
  cleanLabel?: (s: string) => string;
}) {
  const barColor = BAR_COLORS[colorIndex % BAR_COLORS.length];
  const max = entries.length > 0 ? entries[0][1] : 1;

  return (
    <View style={[styles.chartCard, isMobile && styles.chartCardMobile]}>
      <View style={styles.chartHeader}>
        <Ionicons name={icon as any} size={20} color={C.primary} />
        <Text style={styles.chartTitle}>{title}</Text>
      </View>

      {entries.map(([label, count]) => {
        const display = cleanLabel ? cleanLabel(label) : label;
        const percent = pct(count as number, total);
        const widthPct = Math.max(((count as number) / max) * 100, 4);
        return (
          <View key={label} style={styles.barRow} accessibilityLabel={`${display}: ${count} responses, ${percent}%`}>
            <Text style={styles.barLabel} numberOfLines={1}>{display}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${widthPct}%`, backgroundColor: barColor }]} />
            </View>
            <Text style={styles.barPct}>{percent}%</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ─── label cleaners ───────────────────────────────────────────── */
function cleanSpendLabel(s: string): string {
  return s.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '').trim() || s;
}

function cleanFeatureLabel(s: string): string {
  return s.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '').trim() || s;
}

/* ─── styles ───────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  section: {
    paddingHorizontal: '8%' as any,
    paddingVertical: 80,
    backgroundColor: C.white,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700' as any,
    letterSpacing: 2,
    color: C.primary,
    marginBottom: 12,
  },
  heading: {
    fontSize: 36,
    fontWeight: '800' as any,
    color: C.dark,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 44,
  },
  desc: {
    fontSize: 16,
    color: C.slate500,
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 26,
    marginBottom: 48,
  },

  /* stat cards */
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 40, flexWrap: 'wrap', justifyContent: 'center' },
  statsRowMobile: { flexDirection: 'column', alignItems: 'stretch' },
  statCard: {
    backgroundColor: C.bg,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 180,
    flex: 1,
    maxWidth: 240,
    borderWidth: 1,
    borderColor: C.slate200,
  },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 28, fontWeight: '800' as any, color: C.dark, marginBottom: 4 },
  statLabel: { fontSize: 13, color: C.slate500, textAlign: 'center' },

  /* chart cards */
  chartsGrid: { flexDirection: 'row', gap: 20, flexWrap: 'wrap', justifyContent: 'center', width: '100%' },
  chartsGridMobile: { flexDirection: 'column' },
  chartCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: 380,
    backgroundColor: C.bg,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: C.slate200,
  },
  chartCardMobile: { maxWidth: '100%' as any, width: '100%' as any },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  chartTitle: { fontSize: 16, fontWeight: '700' as any, color: C.dark },

  /* bars */
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 110, fontSize: 13, color: C.slate700 },
  barTrack: { flex: 1, height: 10, backgroundColor: C.slate200, borderRadius: 5, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barPct: { width: 38, fontSize: 12, fontWeight: '600' as any, color: C.dark, textAlign: 'right' },
});
