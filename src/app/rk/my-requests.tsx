import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { RKWordmark } from '@/components/ui/RKWordmark';
import {
  getMyTrylandRequests,
  getMyTrylandSponsorships,
  verifyTrylandRequest,
} from '@/services/database/tryland';
import { TrylandRequest, TrylandSponsorship } from '@/types/tryland';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatDate } from '@/utils/formatters';

export default function MyTrylandRequestsScreen() {
  const { colors, isDark } = useTheme();
  const { formatCurrency } = useCurrency();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'requests' | 'sponsorships'>('requests');
  const [requests, setRequests] = useState<TrylandRequest[]>([]);
  const [sponsorships, setSponsorships] = useState<TrylandSponsorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqData, sponData] = await Promise.all([
        getMyTrylandRequests().catch(() => []),
        getMyTrylandSponsorships().catch(() => []),
      ]);
      setRequests(reqData);
      setSponsorships(sponData);
    } catch (err) {
      console.error('Failed to load Tryland data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const statusBadges: Record<string, { label: string; color: string }> = {
    pending_verification: { label: 'PENDING REVIEW', color: '#F59E0B' },
    open: { label: 'APPROVED / OPEN', color: '#10B981' },
    approved: { label: 'APPROVED', color: '#10B981' },
    partially_funded: { label: 'PARTIALLY FUNDED', color: '#10B981' },
    fully_funded: { label: 'FULLY FUNDED', color: colors.success },
    completed: { label: 'COMPLETED', color: colors.success },
    rejected: { label: 'REJECTED', color: colors.expense },
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <RKWordmark size="sm" />
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: '#10B981' }]}
          onPress={() => router.push('/rk/request' as any)}
        >
          <Ionicons name="add" size={16} color="#FFF" />
          <Text style={styles.newBtnText}>New Bill</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'requests' && [styles.tabBtnActive, { borderBottomColor: '#10B981' }],
          ]}
          onPress={() => setActiveTab('requests')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'requests' ? '#10B981' : colors.textSecondary },
              activeTab === 'requests' && { fontWeight: FontWeight.bold },
            ]}
          >
            MY BILL REQUESTS ({requests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'sponsorships' && [styles.tabBtnActive, { borderBottomColor: '#10B981' }],
          ]}
          onPress={() => setActiveTab('sponsorships')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'sponsorships' ? '#10B981' : colors.textSecondary },
              activeTab === 'sponsorships' && { fontWeight: FontWeight.bold },
            ]}
          >
            SPONSORSHIPS GIVEN ({sponsorships.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading records...</Text>
          </View>
        ) : activeTab === 'requests' ? (
          requests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="happy" size={48} color="#10B981" />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Bill Requests Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                If you have an upcoming educational expense or tuition invoice, upload it for Rich Kids to pay!
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => router.push('/rk/request' as any)}
              >
                <Text style={styles.actionBtnText}>Upload First Bill</Text>
              </TouchableOpacity>
            </View>
          ) : (
            requests.map((req) => {
              const badge = statusBadges[req.status] || { label: req.status.toUpperCase(), color: colors.textSecondary };
              const pct = Math.min(100, Math.round((req.amount_funded / req.amount_requested) * 100));

              return (
                <View
                  key={req.id}
                  style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={[styles.catBadge, { color: '#10B981', backgroundColor: '#10B981' + '18' }]}>
                      {req.bill_category}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: badge.color + '20' }]}>
                      <Text style={[styles.statusPillText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>

                  <Text style={[styles.amountRow, { color: colors.text }]}>
                    {formatCurrency(req.amount_requested)}
                  </Text>
                  <Text style={[styles.explanationSnippet, { color: colors.textSecondary }]}>
                    "{req.explanation}"
                  </Text>

                  {/* Progress bar */}
                  <View style={styles.progressWrap}>
                    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceHighlight }]}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: '#10B981' }]} />
                    </View>
                    <Text style={[styles.progressText, { color: colors.text }]}>
                      {pct}% funded · {formatCurrency(req.amount_funded)} of {formatCurrency(req.amount_requested)}
                    </Text>
                  </View>

                  {/* Rejection reason if rejected */}
                  {req.rejection_reason ? (
                    <View style={[styles.rejectionBox, { backgroundColor: colors.expense + '15' }]}>
                      <Text style={[styles.rejectionText, { color: colors.expense }]}>
                        Review Note: {req.rejection_reason}
                      </Text>
                    </View>
                  ) : null}

                  <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                      Submitted {formatDate(req.created_at)}
                    </Text>
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                      Due: {formatDate(req.due_date)}
                    </Text>
                  </View>
                </View>
              );
            })
          )
        ) : (
          /* Sponsorships Given Tab */
          sponsorships.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="heart-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Sponsorships Pledged Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Browse student bill requests and sponsor educational expenses to empower campus peers.
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => router.push('/rk' as any)}
              >
                <Text style={styles.actionBtnText}>Browse Open Bills</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sponsorships.map((sp) => (
              <View
                key={sp.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.catBadge, { color: '#10B981', backgroundColor: '#10B981' + '18' }]}>
                    {sp.bill_category || 'Student Bill'}
                  </Text>
                  <Text style={[styles.sponPill, { color: '#10B981', backgroundColor: '#10B981' + '15' }]}>
                    PLEDGED
                  </Text>
                </View>

                <Text style={[styles.amountRow, { color: colors.text }]}>
                  {formatCurrency(sp.amount)}
                </Text>

                {sp.note ? (
                  <Text style={[styles.explanationSnippet, { color: colors.textSecondary }]}>
                    Your Note: "{sp.note}"
                  </Text>
                ) : null}

                <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                    Pledged on {formatDate(sp.created_at)}
                  </Text>
                  <Text style={[styles.metaText, { color: colors.success }]}>
                    Request Status: {sp.request_status || 'Open'}
                  </Text>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  newBtnText: {
    color: '#FFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
    gap: 12,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  emptySub: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  catBadge: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  sponPill: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  amountRow: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    marginBottom: 6,
  },
  explanationSnippet: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  progressWrap: {
    marginBottom: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    marginTop: 4,
  },
  rejectionBox: {
    padding: 8,
    borderRadius: BorderRadius.sm,
    marginBottom: 8,
  },
  rejectionText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaText: {
    fontSize: 10,
  },
});

