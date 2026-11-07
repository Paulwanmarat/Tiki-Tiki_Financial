/**
 * LiveWebImpactSection
 * Real-time database financial overview on the SPR Website.
 * Displays live figures in Thai Baht (฿) for:
 * 1. Overall SPR Impact
 * 2. 🌳RYLAND Student Bill Sponsorships
 * 3. SPR Donate Campaigns
 *
 * Strict Rule: Only verified payments count toward these totals!
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LOCAL_API_URL } from '@/services/ai/client';
import { LiveImpactTotals, RequestProgress, CampaignProgress } from '@/types/payments';
import { TrylandWordmark } from '@/components/ui/TrylandWordmark';

interface LiveWebImpactSectionProps {
  isMobile: boolean;
  isTablet: boolean;
}

const THB = (n: number) =>
  `฿${(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function LiveWebImpactSection({ isMobile, isTablet }: LiveWebImpactSectionProps) {
  const router = useRouter();
  const [data, setData] = useState<LiveImpactTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overall' | 'tryland' | 'donate'>('overall');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchTotals = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      setError(null);
      const res = await fetch(`${LOCAL_API_URL}/api/impact/live-totals`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const json: LiveImpactTotals = await res.json();
      setData(json);
      setLastRefreshed(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      console.warn('Failed to fetch live totals:', err?.message);
      setError(err?.message || 'Failed to connect to impact server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTotals();
    // Live polling every 30 seconds
    const interval = setInterval(() => {
      fetchTotals();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchTotals]);

  return (
    <View style={styles.sectionRoot}>
      <View style={styles.innerContainer}>
        {/* Eyebrow badge */}
        <View style={styles.eyebrowRow}>
          <View style={styles.livePulseDot} />
          <Text style={styles.eyebrowText}>LIVE REALTIME DATABASE AUDIT · THAI BAHT (฿ THB)</Text>
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={() => fetchTotals(true)}
            activeOpacity={0.7}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <Ionicons name="refresh" size={14} color="#10B981" />
            )}
            <Text style={styles.refreshLabel}>{lastRefreshed ? `Updated ${lastRefreshed}` : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>

        {/* Section Heading */}
        <Text style={[styles.mainHeading, isMobile && { fontSize: 26 }]}>
          Campus Mutual Aid & Impact Totals
        </Text>
        <Text style={[styles.subHeading, isMobile && { fontSize: 14 }]}>
          Real-time verified funding figures retrieved directly from our PostgreSQL ledger.
          Every baht displayed below represents an authenticated bank transfer verified by administrators.
          Pending, unverified, or duplicate transfers are strictly excluded.
        </Text>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'overall' && styles.tabBtnActive]}
            onPress={() => setActiveTab('overall')}
            activeOpacity={0.8}
          >
            <Ionicons name="globe-outline" size={16} color={activeTab === 'overall' ? '#F96A98' : '#8A7B91'} />
            <Text style={[styles.tabBtnText, activeTab === 'overall' && styles.tabBtnTextActive]}>
              Combined SPR Impact
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'tryland' && styles.tabBtnActive]}
            onPress={() => setActiveTab('tryland')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 14 }}>👑</Text>
            <Text style={[styles.tabBtnText, activeTab === 'tryland' && styles.tabBtnTextActive]}>
              👑 RK (Rich Kid) Bills
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'donate' && styles.tabBtnActive]}
            onPress={() => setActiveTab('donate')}
            activeOpacity={0.8}
          >
            <Ionicons name="heart" size={15} color={activeTab === 'donate' ? '#F59E0B' : '#8A7B91'} />
            <Text style={[styles.tabBtnText, activeTab === 'donate' && styles.tabBtnTextActive]}>
              SPR Donate Campaigns
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && !data && (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#F96A98" />
            <Text style={styles.loaderText}>Syncing live database figures…</Text>
          </View>
        )}

        {/* Error State */}
        {error && !data && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
            <Text style={styles.errorText}>Could not load impact figures: {error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchTotals(true)}>
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content Tabs */}
        {data && (
          <>
            {/* 1. OVERALL TAB */}
            {activeTab === 'overall' && (
              <View style={styles.tabContent}>
                {/* Big Hero Card */}
                <View style={styles.heroImpactCard}>
                  <Text style={styles.heroImpactLabel}>TOTAL VERIFIED COMMUNITY FUNDING RAISED</Text>
                  <Text style={[styles.heroImpactAmount, isMobile && { fontSize: 36 }]}>
                    {THB(data.overall.totalMoneyRaised)}
                  </Text>
                  <Text style={styles.heroImpactSub}>
                    Combined sum of verified 🌳RYLAND student bill sponsorships and SPR Donate contributions
                  </Text>

                  {/* Split banner */}
                  <View style={[styles.splitRow, isMobile && { flexDirection: 'column', gap: 14 }]}>
                    <View style={styles.splitCol}>
                      <View style={styles.splitHeader}>
                        <Text style={{ fontSize: 16 }}>👑</Text>
                        <Text style={[styles.splitTitle, { color: '#10B981' }]}>RK (RICH KID) BILLS</Text>
                      </View>
                      <Text style={[styles.splitValue, { color: '#10B981' }]}>
                        {THB(data.overall.totalVerifiedSponsorships)}
                      </Text>
                      <Text style={styles.splitSub}>
                        {data.overall.successfulSponsorshipsCount} verified bill transfers
                      </Text>
                    </View>

                    <View style={[styles.splitDivider, isMobile && { width: '100%', height: 1 }]} />

                    <View style={styles.splitCol}>
                      <View style={styles.splitHeader}>
                        <Ionicons name="heart" size={15} color="#F59E0B" />
                        <Text style={[styles.splitTitle, { color: '#F59E0B' }]}>SPR DONATE CAUSES</Text>
                      </View>
                      <Text style={[styles.splitValue, { color: '#F59E0B' }]}>
                        {THB(data.overall.totalVerifiedDonations)}
                      </Text>
                      <Text style={styles.splitSub}>
                        {data.overall.successfulDonationsCount} verified campaign contributions
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 3 Metrics Cards */}
                <View style={[styles.metricsGrid, isMobile && { flexDirection: 'column' }]}>
                  <View style={styles.metricCard}>
                    <View style={[styles.metricIconWrap, { backgroundColor: '#F96A9818' }]}>
                      <Ionicons name="checkmark-done-circle" size={22} color="#F96A98" />
                    </View>
                    <Text style={styles.metricValue}>{data.overall.combinedSuccessfulTransactions}</Text>
                    <Text style={styles.metricLabel}>Total Verified Transfers</Text>
                    <Text style={styles.metricSub}>Bank receipts checked & approved</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <View style={[styles.metricIconWrap, { backgroundColor: '#10B98118' }]}>
                      <Ionicons name="school" size={22} color="#10B981" />
                    </View>
                    <Text style={styles.metricValue}>{data.overall.successfullyFundedRequestsCount}</Text>
                    <Text style={styles.metricLabel}>Student Bills Fully Funded</Text>
                    <Text style={styles.metricSub}>100% relief delivered to peers</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <View style={[styles.metricIconWrap, { backgroundColor: '#F59E0B18' }]}>
                      <Ionicons name="trophy" size={22} color="#F59E0B" />
                    </View>
                    <Text style={styles.metricValue}>{data.overall.completedCampaignsCount}</Text>
                    <Text style={styles.metricLabel}>Campus Causes Reached</Text>
                    <Text style={styles.metricSub}>Goals successfully achieved</Text>
                  </View>
                </View>
              </View>
            )}

            {/* 2. 🌳RYLAND TAB */}
            {activeTab === 'tryland' && (
              <View style={styles.tabContent}>
                <View style={[styles.statsOverviewRow, isMobile && { flexDirection: 'column' }]}>
                  <View style={[styles.statOverviewBox, { borderColor: '#10B981' }]}>
                    <Text style={styles.statOverviewLabel}>TOTAL SPONSORSHIP RECEIVED</Text>
                    <Text style={[styles.statOverviewValue, { color: '#10B981' }]}>
                      {THB(data.tryland.totalFundingReceived)}
                    </Text>
                    <Text style={styles.statOverviewSub}>Verified donor transfers</Text>
                  </View>

                  <View style={[styles.statOverviewBox, { borderColor: '#2E223B' }]}>
                    <Text style={styles.statOverviewLabel}>TOTAL AMOUNT REQUESTED</Text>
                    <Text style={styles.statOverviewValue}>
                      {THB(data.tryland.totalAmountRequested)}
                    </Text>
                    <Text style={styles.statOverviewSub}>Across {data.tryland.activeRequestsCount} student bill requests</Text>
                  </View>

                  <View style={[styles.statOverviewBox, { borderColor: '#F59E0B' }]}>
                    <Text style={styles.statOverviewLabel}>TOTAL AMOUNT STILL NEEDED</Text>
                    <Text style={[styles.statOverviewValue, { color: '#F59E0B' }]}>
                      {THB(data.tryland.totalAmountStillNeeded)}
                    </Text>
                    <Text style={styles.statOverviewSub}>Open for community sponsorship</Text>
                  </View>
                </View>

                {/* Individual requests progress */}
                <View style={styles.progressListWrap}>
                  <Text style={styles.progressListTitle}>Active Student Bill Requests</Text>
                  {data.tryland.requestsProgress.map((req: RequestProgress) => (
                    <View key={req.id} style={styles.progressItemCard}>
                      <View style={styles.progressItemTop}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.studentBadgeRow}>
                            <Text style={styles.studentAliasText}>{req.studentAlias}</Text>
                            <View style={styles.categoryBadge}>
                              <Text style={styles.categoryBadgeText}>{req.billCategory}</Text>
                            </View>
                          </View>
                          <Text style={styles.progressItemSub}>
                            Due: {req.dueDate ? new Date(req.dueDate).toLocaleDateString('th-TH') : 'Upcoming'} · Status: {req.status.replace(/_/g, ' ')}
                          </Text>
                        </View>
                        <View style={[styles.pctBadge, { backgroundColor: req.percentage >= 100 ? '#10B98120' : '#1C1525' }]}>
                          <Text style={[styles.pctBadgeText, { color: req.percentage >= 100 ? '#10B981' : '#F96A98' }]}>
                            {req.percentage}%
                          </Text>
                        </View>
                      </View>

                      {/* Bar */}
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${Math.min(100, req.percentage)}%`,
                              backgroundColor: req.percentage >= 100 ? '#10B981' : '#10B981',
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.barBottomRow}>
                        <Text style={[styles.barAmountFunded, { color: '#10B981' }]}>
                          {THB(req.amountFunded)} funded
                        </Text>
                        <Text style={styles.barAmountNeeded}>
                          Target: {THB(req.amountRequested)} {req.remainingNeeded > 0 ? `(${THB(req.remainingNeeded)} remaining)` : '(Complete)'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* CTA */}
                <View style={styles.tabCtaBox}>
                  <TouchableOpacity
                    style={[styles.primaryCtaBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => router.push('/tryland')}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontSize: 16 }}>🌳</Text>
                    <Text style={styles.primaryCtaBtnText}>Browse & Sponsor Bills on 🌳RYLAND →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 3. SPR DONATE TAB */}
            {activeTab === 'donate' && (
              <View style={styles.tabContent}>
                <View style={[styles.statsOverviewRow, isMobile && { flexDirection: 'column' }]}>
                  <View style={[styles.statOverviewBox, { borderColor: '#F59E0B' }]}>
                    <Text style={styles.statOverviewLabel}>TOTAL DONATIONS RECEIVED</Text>
                    <Text style={[styles.statOverviewValue, { color: '#F59E0B' }]}>
                      {THB(data.donate.totalDonationsReceived)}
                    </Text>
                    <Text style={styles.statOverviewSub}>Verified community support</Text>
                  </View>

                  <View style={[styles.statOverviewBox, { borderColor: '#2E223B' }]}>
                    <Text style={styles.statOverviewLabel}>COMBINED CAMPAIGN GOALS</Text>
                    <Text style={styles.statOverviewValue}>
                      {THB(data.donate.totalCampaignTargets)}
                    </Text>
                    <Text style={styles.statOverviewSub}>Across {data.donate.activeCampaignsCount} causes</Text>
                  </View>

                  <View style={[styles.statOverviewBox, { borderColor: '#EC4899' }]}>
                    <Text style={styles.statOverviewLabel}>TOTAL REMAINING TOWARDS TARGETS</Text>
                    <Text style={[styles.statOverviewValue, { color: '#EC4899' }]}>
                      {THB(data.donate.totalAmountRemaining)}
                    </Text>
                    <Text style={styles.statOverviewSub}>Remaining to full funding</Text>
                  </View>
                </View>

                {/* Individual campaign progress */}
                <View style={styles.progressListWrap}>
                  <Text style={styles.progressListTitle}>Active Campus Fundraising Campaigns</Text>
                  {data.donate.campaignsProgress.length === 0 ? (
                    <View style={{ padding: 28, borderRadius: 12, backgroundColor: '#1C1525', borderWidth: 1, borderColor: '#2E223B', alignItems: 'center' }}>
                      <Ionicons name="shield-checkmark-outline" size={30} color="#F59E0B" style={{ marginBottom: 8 }} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#FDF8F4', marginBottom: 4 }}>
                        Official Campaign Registry Clean
                      </Text>
                      <Text style={{ fontSize: 12, color: '#B9ABC1', textAlign: 'center', maxWidth: 460, lineHeight: 18 }}>
                        Currently, there are no active public fundraising campaigns. All student causes and community endowments must be inaugurated and verified by Saipanyarangsit School administrators and the Application Owner.
                      </Text>
                    </View>
                  ) : (
                    data.donate.campaignsProgress.map((camp: CampaignProgress) => (
                      <View key={camp.id} style={styles.progressItemCard}>
                        <View style={styles.progressItemTop}>
                          <View style={{ flex: 1 }}>
                            <View style={styles.studentBadgeRow}>
                              <Text style={styles.studentAliasText} numberOfLines={1}>{camp.title}</Text>
                              <View style={[styles.categoryBadge, { backgroundColor: '#F59E0B18' }]}>
                                <Text style={[styles.categoryBadgeText, { color: '#F59E0B' }]}>{camp.category}</Text>
                              </View>
                            </View>
                            <Text style={styles.progressItemSub}>
                              Status: {camp.status} {camp.endDate ? `· Ends: ${new Date(camp.endDate).toLocaleDateString('th-TH')}` : ''}
                            </Text>
                          </View>
                          <View style={[styles.pctBadge, { backgroundColor: camp.percentage >= 100 ? '#F59E0B20' : '#1C1525' }]}>
                            <Text style={[styles.pctBadgeText, { color: camp.percentage >= 100 ? '#F59E0B' : '#EC4899' }]}>
                              {camp.percentage}%
                            </Text>
                          </View>
                        </View>

                        {/* Bar */}
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${Math.min(100, camp.percentage)}%`,
                                backgroundColor: camp.percentage >= 100 ? '#F59E0B' : '#EC4899',
                              },
                            ]}
                          />
                        </View>

                        <View style={styles.barBottomRow}>
                          <Text style={[styles.barAmountFunded, { color: '#F59E0B' }]}>
                            {THB(camp.amountRaised)} raised
                          </Text>
                          <Text style={styles.barAmountNeeded}>
                            Target: {THB(camp.targetAmount)} {camp.remainingNeeded > 0 ? `(${THB(camp.remainingNeeded)} remaining)` : '(Completed)'}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* CTA */}
                <View style={styles.tabCtaBox}>
                  <TouchableOpacity
                    style={[styles.primaryCtaBtn, { backgroundColor: '#EC4899' }]}
                    onPress={() => router.push('/donate')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="heart" size={18} color="#FFF" />
                    <Text style={styles.primaryCtaBtnText}>Explore All Campaigns on SPR Donate →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Audit Transparency Disclaimer Box */}
            <View style={styles.auditNoticeCard}>
              <View style={styles.auditNoticeIcon}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.auditNoticeTitle}>STRICT AUDIT & TRANSPARENCY GUARANTEE</Text>
                <Text style={styles.auditNoticeBody}>
                  All figures above are computed in real time from verified database records.
                  Payments marked as <Text style={{ color: '#F59E0B', fontWeight: '700' }}>Pending Verification</Text>,{' '}
                  <Text style={{ color: '#EF4444', fontWeight: '700' }}>Rejected</Text>,{' '}
                  or duplicate transfers are strictly excluded.
                  Funds flow directly towards approved student expenses and transparent community causes without platform fees.
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionRoot: {
    backgroundColor: '#0D0912',
    paddingVertical: 72,
    borderTopWidth: 1,
    borderTopColor: '#2E223B',
    borderBottomWidth: 1,
    borderBottomColor: '#2E223B',
  },
  innerContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  eyebrowText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 1.5,
  },
  refreshIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98118',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    marginLeft: 8,
  },
  refreshLabel: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  mainHeading: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FDF8F4',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subHeading: {
    fontSize: 15,
    color: '#B9ABC1',
    lineHeight: 22,
    maxWidth: 820,
    marginBottom: 28,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#140E1B',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2E223B',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#201729',
    borderWidth: 1,
    borderColor: '#F96A9840',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A7B91',
  },
  tabBtnTextActive: {
    color: '#FDF8F4',
  },
  loaderBox: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#B9ABC1',
    fontSize: 14,
  },
  errorBox: {
    padding: 24,
    backgroundColor: '#EF444414',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 14,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  retryBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  tabContent: {
    gap: 20,
  },
  heroImpactCard: {
    backgroundColor: '#1C1525',
    borderWidth: 1.5,
    borderColor: '#F96A98',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  heroImpactLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F96A98',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroImpactAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FDF8F4',
    letterSpacing: -1,
    marginBottom: 6,
  },
  heroImpactSub: {
    fontSize: 13,
    color: '#B9ABC1',
    textAlign: 'center',
    maxWidth: 620,
    marginBottom: 24,
  },
  splitRow: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#2E223B',
    alignItems: 'stretch',
  },
  splitCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  splitTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  splitValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  splitSub: {
    fontSize: 12,
    color: '#7D6E86',
  },
  splitDivider: {
    width: 1,
    backgroundColor: '#2E223B',
    marginHorizontal: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#17101E',
    borderWidth: 1,
    borderColor: '#2E223B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  metricIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FDF8F4',
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FDF8F4',
    textAlign: 'center',
  },
  metricSub: {
    fontSize: 12,
    color: '#7D6E86',
    textAlign: 'center',
  },
  statsOverviewRow: {
    flexDirection: 'row',
    gap: 14,
  },
  statOverviewBox: {
    flex: 1,
    backgroundColor: '#17101E',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    gap: 4,
  },
  statOverviewLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7D6E86',
    letterSpacing: 1,
  },
  statOverviewValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FDF8F4',
  },
  statOverviewSub: {
    fontSize: 12,
    color: '#B9ABC1',
  },
  progressListWrap: {
    gap: 12,
    marginTop: 8,
  },
  progressListTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FDF8F4',
    marginBottom: 4,
  },
  progressItemCard: {
    backgroundColor: '#17101E',
    borderWidth: 1,
    borderColor: '#2E223B',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  progressItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  studentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  studentAliasText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FDF8F4',
  },
  categoryBadge: {
    backgroundColor: '#10B98118',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  progressItemSub: {
    fontSize: 12,
    color: '#7D6E86',
    marginTop: 3,
  },
  pctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pctBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#201729',
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
  },
  barBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  barAmountFunded: {
    fontSize: 13,
    fontWeight: '800',
  },
  barAmountNeeded: {
    fontSize: 12,
    color: '#7D6E86',
  },
  tabCtaBox: {
    marginTop: 12,
    alignItems: 'center',
  },
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryCtaBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
  auditNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#140E1B',
    borderWidth: 1,
    borderColor: '#10B98140',
    borderRadius: 16,
    padding: 20,
    gap: 14,
    marginTop: 16,
  },
  auditNoticeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B98118',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditNoticeTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 1,
    marginBottom: 4,
  },
  auditNoticeBody: {
    fontSize: 12,
    color: '#B9ABC1',
    lineHeight: 18,
  },
});

