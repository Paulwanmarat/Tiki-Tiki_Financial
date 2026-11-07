/**
 * SPR Impact — Live Money Totals
 * Displays real, database-backed funding totals for TRYLAND and SPR Donate.
 * Only verified payments count toward any total.
 * Data is fetched fresh every time this screen mounts.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { getLiveImpactTotals } from '@/services/database/payments';
import { LiveImpactTotals, RequestProgress, CampaignProgress } from '@/types/payments';
import { Card } from '@/components/ui/Card';
import { RKWordmark } from '@/components/ui/RKWordmark';
import { TrylandWordmark } from '@/components/ui/TrylandWordmark';
import { PIGGY_LOGO, SCHOOL_LOGO } from '@/constants/assets';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';

const THB = (n: number) =>
  `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ProgressBar({ percentage, color }: { percentage: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[barStyles.track, { backgroundColor: colors.surfaceHighlight }]}>
      <View style={[barStyles.fill, { width: `${Math.min(100, percentage)}%`, backgroundColor: color }]} />
    </View>
  );
}
const barStyles = StyleSheet.create({
  track: { height: 8, borderRadius: 99, overflow: 'hidden', marginVertical: 4 },
  fill: { height: '100%', borderRadius: 99 },
});

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[statStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[statStyles.iconBg, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[statStyles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.textSecondary }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}
const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: 100,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center' },
  label: { fontSize: FontSize.xs, textAlign: 'center', lineHeight: 15 },
});

export default function ImpactTotalsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [data, setData] = useState<LiveImpactTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const totals = await getLiveImpactTotals();
      setData(totals);
      setUpdatedAt(new Date().toLocaleTimeString('th-TH'));
    } catch (err: any) {
      setError(err?.message || 'Failed to load impact totals.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>SPR Impact Totals</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
            Live database figures · verified payments only
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: Spacing.sm }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.primary }}>
            <Image source={PIGGY_LOGO} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
          <View style={{ width: 26, height: 26, borderRadius: 6, overflow: 'hidden', backgroundColor: '#FFFFFF', padding: 2 }}>
            <Image source={SCHOOL_LOGO} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
        </View>
        <TouchableOpacity onPress={loadData} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Fetching live totals…</Text>
        </View>
      ) : error && !data ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Could Not Load</Text>
          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={loadData}>
            <Text style={{ color: '#fff', fontWeight: FontWeight.semibold }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Last updated */}
          {updatedAt && (
            <View style={[styles.updatedRow, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
              <Text style={[styles.updatedText, { color: colors.textSecondary }]}>
                Live data · Last refreshed {updatedAt} · Only verified payments included
              </Text>
            </View>
          )}

          {/* ═══ OVERALL IMPACT ════════════════════════════════════════════ */}
          <View style={styles.sectionHeader}>
            <Ionicons name="globe-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Overall SPR Impact</Text>
          </View>

          {/* Hero — Total Raised */}
          {data && (
            <>
              <View style={[styles.heroCard, { backgroundColor: colors.primary + '14', borderColor: colors.primary }]}>
                <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Total Verified Funding Raised</Text>
                <Text style={[styles.heroAmount, { color: colors.primary }]}>
                  {THB(data.overall.totalMoneyRaised)}
                </Text>
                <View style={[styles.heroSplit, { borderTopColor: colors.border }]}>
                  <View style={styles.heroSplitItem}>
                    <Text style={[styles.heroSplitLabel, { color: '#10B981' }]}>🌳 TRYLAND Trees</Text>
                    <Text style={[styles.heroSplitValue, { color: '#10B981' }]}>
                      {THB(data.overall.totalVerifiedTreeDonations || 0)}
                    </Text>
                  </View>
                  <View style={[styles.heroSplitDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.heroSplitItem}>
                    <Text style={[styles.heroSplitLabel, { color: '#3B82F6' }]}>👦 RK Bills</Text>
                    <Text style={[styles.heroSplitValue, { color: '#3B82F6' }]}>
                      {THB(data.overall.totalVerifiedSponsorships)}
                    </Text>
                  </View>
                  <View style={[styles.heroSplitDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.heroSplitItem}>
                    <Text style={[styles.heroSplitLabel, { color: '#F59E0B' }]}>♥ SPR Donate</Text>
                    <Text style={[styles.heroSplitValue, { color: '#F59E0B' }]}>
                      {THB(data.overall.totalVerifiedDonations)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Overall Stats Grid */}
              <View style={styles.statsGrid}>
                <StatCard
                  icon="checkmark-done-circle-outline"
                  label="Total Verified Transactions"
                  value={String(data.overall.combinedSuccessfulTransactions)}
                  color={colors.primary}
                />
                <StatCard
                  icon="school-outline"
                  label="Student Requests Funded"
                  value={String(data.overall.successfullyFundedRequestsCount)}
                  color="#10B981"
                />
                <StatCard
                  icon="trophy-outline"
                  label="Campaigns Completed"
                  value={String(data.overall.completedCampaignsCount)}
                  color="#F59E0B"
                />
              </View>

              {/* ═══ 🌳 TRYLAND (Save The Planet) SECTION ══════════════════ */}
              <View style={styles.sectionHeader}>
                <TrylandWordmark size="sm" />
                <Text style={[styles.sectionTitleSecondary, { color: colors.textSecondary }]}>
                  Save The Planet · Tree Planting
                </Text>
              </View>

              <Card style={{ marginBottom: Spacing.md }}>
                <View style={styles.biRow}>
                  <View style={styles.biItem}>
                    <Text style={[styles.biLabel, { color: colors.textTertiary }]}>Trees Planted</Text>
                    <Text style={[styles.biValue, { color: '#10B981' }]}>
                      {data.trees?.totalTreesPlanted || 0}
                    </Text>
                  </View>
                  <View style={[styles.biDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.biItem}>
                    <Text style={[styles.biLabel, { color: colors.textTertiary }]}>Green Funding</Text>
                    <Text style={[styles.biValue, { color: colors.text }]}>
                      {THB(data.trees?.totalFundingReceived || 0)}
                    </Text>
                  </View>
                  <View style={[styles.biDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.biItem}>
                    <Text style={[styles.biLabel, { color: colors.textTertiary }]}>CO₂ Offset</Text>
                    <Text style={[styles.biValue, { color: '#34D399' }]}>
                      {((data.trees?.totalTreesPlanted || 0) * 22).toLocaleString('th-TH')} kg
                    </Text>
                  </View>
                </View>
              </Card>

              {data.trees?.initiativesProgress && data.trees.initiativesProgress.length > 0 && (
                <View style={{ marginBottom: Spacing.lg }}>
                  <Text style={[styles.subSectionLabel, { color: colors.textSecondary }]}>
                    Active Tree Planting Initiatives ({data.trees.activeInitiativesCount} initiatives)
                  </Text>
                  {data.trees.initiativesProgress.map(init => (
                    <Card key={init.id} style={styles.progressCard}>
                      <View style={styles.progressCardRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.progressCardTitle, { color: colors.text }]}>
                            🌳 {init.title}
                          </Text>
                          <Text style={[styles.progressCardSub, { color: colors.textTertiary }]}>
                            {init.treesPlanted} / {init.targetTrees} trees planted · {THB(init.costPerTree)} / tree
                          </Text>
                        </View>
                        <Text style={[styles.progressPctBadge, {
                          color: init.percentage >= 100 ? '#10B981' : colors.textSecondary,
                          backgroundColor: init.percentage >= 100 ? '#10B98118' : colors.surfaceHighlight,
                        }]}>
                          {init.percentage}%
                        </Text>
                      </View>
                      <ProgressBar
                        percentage={init.percentage}
                        color="#10B981"
                      />
                      <View style={styles.progressAmounts}>
                        <Text style={[styles.progressFunded, { color: '#10B981' }]}>{THB(init.amountRaised)} raised</Text>
                        <Text style={[styles.progressRemaining, { color: colors.textTertiary }]}>
                          Goal: {init.targetTrees} trees ({THB(init.targetTrees * init.costPerTree)})
                        </Text>
                      </View>
                    </Card>
                  ))}
                </View>
              )}

              {/* ═══ RK (Rich Kid) SECTION ══════════════════════════════════════ */}
              <View style={styles.sectionHeader}>
                <RKWordmark size="sm" />
                <Text style={[styles.sectionTitleSecondary, { color: colors.textSecondary }]}>
                  Rich Kid Bill Sponsorship
                </Text>
              </View>

              <Card style={{ marginBottom: Spacing.md }}>
                <View style={styles.biRow}>
                  <View style={styles.biItem}>
                    <Text style={[styles.biLabel, { color: colors.textTertiary }]}>Total Funding Received</Text>
                    <Text style={[styles.biValue, { color: '#10B981' }]}>{THB(data.tryland.totalFundingReceived)}</Text>
                  </View>
                  <View style={[styles.biDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.biItem}>
                    <Text style={[styles.biLabel, { color: colors.textTertiary }]}>Total Requested</Text>
                    <Text style={[styles.biValue, { color: colors.text }]}>{THB(data.tryland.totalAmountRequested)}</Text>
                  </View>
                  <View style={[styles.biDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.biItem}>
                    <Text style={[styles.biLabel, { color: colors.textTertiary }]}>Still Needed</Text>
                    <Text style={[styles.biValue, { color: '#F59E0B' }]}>{THB(data.tryland.totalAmountStillNeeded)}</Text>
                  </View>
                </View>

                {/* Overall TRYLAND progress bar */}
                {data.tryland.totalAmountRequested > 0 && (
                  <View style={{ marginTop: Spacing.md }}>
                    <View style={styles.progressLabelRow}>
                      <Text style={[styles.progressPct, { color: '#10B981' }]}>
                        {Math.round((data.tryland.totalFundingReceived / data.tryland.totalAmountRequested) * 100)}%
                      </Text>
                      <Text style={[styles.progressSub, { color: colors.textTertiary }]}>of all requests funded</Text>
                    </View>
                    <ProgressBar
                      percentage={(data.tryland.totalFundingReceived / data.tryland.totalAmountRequested) * 100}
                      color="#10B981"
                    />
                  </View>
                )}
              </Card>

              {/* Individual request progress */}
              {data.tryland.requestsProgress.length > 0 && (
                <View style={{ marginBottom: Spacing.lg }}>
                  <Text style={[styles.subSectionLabel, { color: colors.textSecondary }]}>
                    Individual Request Progress ({data.tryland.activeRequestsCount} active)
                  </Text>
                  {data.tryland.requestsProgress.map((req: RequestProgress) => (
                    <Card key={req.id} style={styles.progressCard}>
                      <View style={styles.progressCardRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.progressCardTitle, { color: colors.text }]}>
                            {req.studentAlias} · {req.billCategory}
                          </Text>
                          <Text style={[styles.progressCardSub, { color: colors.textTertiary }]}>
                            Due: {req.dueDate ? new Date(req.dueDate).toLocaleDateString('th-TH') : '—'} · {req.status.replace(/_/g, ' ')}
                          </Text>
                        </View>
                        <Text style={[styles.progressPctBadge, {
                          color: req.percentage >= 100 ? '#10B981' : colors.textSecondary,
                          backgroundColor: req.percentage >= 100 ? '#10B98118' : colors.surfaceHighlight,
                        }]}>
                          {req.percentage}%
                        </Text>
                      </View>
                      <ProgressBar
                        percentage={req.percentage}
                        color={req.percentage >= 100 ? '#10B981' : '#3B82F6'}
                      />
                      <View style={styles.progressAmounts}>
                        <Text style={[styles.progressFunded, { color: '#10B981' }]}>{THB(req.amountFunded)} raised</Text>
                        {req.remainingNeeded > 0 && (
                          <Text style={[styles.progressRemaining, { color: colors.textTertiary }]}>
                            {THB(req.remainingNeeded)} still needed
                          </Text>
                        )}
                      </View>
                    </Card>
                  ))}
                </View>
              )}

              {/* ═══ SPR DONATE SECTION ════════════════════════════════════ */}
              <View style={styles.sectionHeader}>
                <Ionicons name="heart" size={18} color="#F59E0B" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>SPR Donate</Text>
                <Text style={[styles.sectionTitleSecondary, { color: colors.textSecondary }]}>
                  Campus Fundraising
                </Text>
              </View>

              <Card style={{ marginBottom: Spacing.md }}>
                <View style={styles.biRow}>
                  <View style={styles.biItem}>
                    <Text style={[styles.biLabel, { color: colors.textTertiary }]}>Total Donations</Text>
                    <Text style={[styles.biValue, { color: '#F59E0B' }]}>{THB(data.donate.totalDonationsReceived)}</Text>
                  </View>
                  <View style={[styles.biDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.biItem}>
                    <Text style={[styles.biLabel, { color: colors.textTertiary }]}>Campaign Targets</Text>
                    <Text style={[styles.biValue, { color: colors.text }]}>{THB(data.donate.totalCampaignTargets)}</Text>
                  </View>
                  <View style={[styles.biDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.biItem}>
                    <Text style={[styles.biLabel, { color: colors.textTertiary }]}>Remaining</Text>
                    <Text style={[styles.biValue, { color: '#F59E0B' }]}>{THB(data.donate.totalAmountRemaining)}</Text>
                  </View>
                </View>
              </Card>

              {/* Campaign-level progress */}
              {data.donate.campaignsProgress.length > 0 && (
                <View>
                  <Text style={[styles.subSectionLabel, { color: colors.textSecondary }]}>
                    Campaign Progress ({data.donate.activeCampaignsCount} campaigns)
                  </Text>
                  {data.donate.campaignsProgress.map((camp: CampaignProgress) => (
                    <Card key={camp.id} style={styles.progressCard}>
                      <View style={styles.progressCardRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.progressCardTitle, { color: colors.text }]} numberOfLines={2}>
                            {camp.title}
                          </Text>
                          <Text style={[styles.progressCardSub, { color: colors.textTertiary }]}>
                            {camp.category} · {camp.status}
                          </Text>
                        </View>
                        <Text style={[styles.progressPctBadge, {
                          color: camp.percentage >= 100 ? '#F59E0B' : colors.textSecondary,
                          backgroundColor: camp.percentage >= 100 ? '#F59E0B18' : colors.surfaceHighlight,
                        }]}>
                          {camp.percentage}%
                        </Text>
                      </View>
                      <ProgressBar
                        percentage={camp.percentage}
                        color={camp.percentage >= 100 ? '#F59E0B' : '#F96A98'}
                      />
                      <View style={styles.progressAmounts}>
                        <Text style={[styles.progressFunded, { color: '#F59E0B' }]}>{THB(camp.amountRaised)} raised</Text>
                        <Text style={[styles.progressRemaining, { color: colors.textTertiary }]}>
                          Goal: {THB(camp.targetAmount)}
                        </Text>
                      </View>
                    </Card>
                  ))}
                </View>
              )}

              {/* Disclaimer */}
              <View style={[styles.disclaimerBox, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
                  All figures represent verified funding received from real PromptPay QR transfers confirmed by administrators. Pending, rejected, failed, and duplicate payments are excluded. Currency: Thai Baht (฿ THB).
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  headerSub: { fontSize: FontSize.xs, marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl, gap: Spacing.md },
  loadingText: { fontSize: FontSize.sm, marginTop: Spacing.sm },
  errorTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  errorSub: { fontSize: FontSize.sm, textAlign: 'center' },
  retryBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.sm },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  updatedText: { fontSize: FontSize.xs, flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  sectionTitleSecondary: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  heroCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  heroLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: 4 },
  heroAmount: { fontSize: 36, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  heroSplit: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    width: '100%',
  },
  heroSplitItem: { flex: 1, alignItems: 'center' },
  heroSplitLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginBottom: 2 },
  heroSplitValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  heroSplitDivider: { width: 1, marginHorizontal: Spacing.md },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  biRow: { flexDirection: 'row', alignItems: 'stretch' },
  biItem: { flex: 1, padding: Spacing.sm, alignItems: 'center' },
  biDivider: { width: 1, marginVertical: Spacing.xs },
  biLabel: { fontSize: FontSize.xs, textAlign: 'center', marginBottom: 4 },
  biValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, textAlign: 'center' },
  progressLabelRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  progressPct: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  progressSub: { fontSize: FontSize.sm },
  subSectionLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  progressCard: { marginBottom: Spacing.sm },
  progressCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  progressCardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  progressCardSub: { fontSize: FontSize.xs, marginTop: 2 },
  progressPctBadge: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  progressAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressFunded: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  progressRemaining: { fontSize: FontSize.xs },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xl,
  },
  disclaimerText: { fontSize: 10, flex: 1, lineHeight: 15 },
});

