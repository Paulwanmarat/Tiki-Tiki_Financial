/**
 * Admin Payment Verification Dashboard
 * Restricted to administrators only (role === 'admin' or admin@ email).
 * Lists pending QR payment submissions for TRYLAND sponsorships and SPR Donate campaigns.
 * Allows approve / reject with reason.
 * Only verified payments update the public funding totals.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getAdminPayments, verifyAdminPayment } from '@/services/database/payments';
import { PaymentSubmission } from '@/types/payments';
import { Card } from '@/components/ui/Card';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';

function formatThb(amount: number): string {
  return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

type StatusFilter = 'pending' | 'verified' | 'rejected' | 'all';
type TypeFilter = 'all' | 'tryland' | 'donate';

export default function AdminPaymentsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [payments, setPayments] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<PaymentSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [verifying, setVerifying] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    try {
      setError(null);
      const data = await getAdminPayments({
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        search: search.trim() || undefined,
      });
      setPayments(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payments. Administrator access required.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    setLoading(true);
    loadPayments();
  }, [loadPayments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPayments();
  }, [loadPayments]);

  const handleApprove = useCallback(async (payment: PaymentSubmission) => {
    Alert.alert(
      'Verify Payment',
      `Approve ${formatThb(payment.amount)} from ${payment.submitter_name || payment.submitter_email}?\n\nRef: ${payment.payment_reference}\n\nThis will update the funding total immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Verify',
          style: 'default',
          onPress: async () => {
            setVerifying(payment.id);
            try {
              await verifyAdminPayment(payment.type, payment.id, 'approve');
              await loadPayments();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to verify payment.');
            } finally {
              setVerifying(null);
            }
          },
        },
      ]
    );
  }, [loadPayments]);

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      Alert.alert('Required', 'Please enter a rejection reason.');
      return;
    }
    setVerifying(rejectTarget.id);
    try {
      await verifyAdminPayment(rejectTarget.type, rejectTarget.id, 'reject', rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
      await loadPayments();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to reject payment.');
    } finally {
      setVerifying(null);
    }
  }, [rejectTarget, rejectReason, loadPayments]);

  const statusColor = (s: string) => {
    if (s === 'verified') return '#10B981';
    if (s === 'rejected') return '#EF4444';
    return '#F59E0B'; // pending
  };

  const statusLabel = (s: string) => {
    if (s === 'verified') return '✓ Verified';
    if (s === 'rejected') return '✗ Rejected';
    return '⏳ Pending';
  };

  const pendingCount = payments.filter(p => p.status === 'pending').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Verification</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>Admin Dashboard</Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
          </View>
        )}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Search */}
        <View style={{ padding: Spacing.lg }}>
          <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textTertiary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search reference, name, slip…"
              placeholderTextColor={colors.textTertiary}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
              onSubmitEditing={loadPayments}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Status Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.sm }}>
            <View style={styles.chipRow}>
              {(['pending', 'verified', 'rejected', 'all'] as StatusFilter[]).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, { backgroundColor: statusFilter === s ? statusColor(s) + '22' : colors.surface, borderColor: statusFilter === s ? statusColor(s) : colors.border }]}
                  onPress={() => setStatusFilter(s)}
                >
                  <Text style={[styles.chipText, { color: statusFilter === s ? statusColor(s) : colors.textSecondary }]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={{ width: Spacing.sm }} />
              {(['all', 'tryland', 'donate'] as TypeFilter[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, { backgroundColor: typeFilter === t ? colors.primary + '22' : colors.surface, borderColor: typeFilter === t ? colors.primary : colors.border }]}
                  onPress={() => setTypeFilter(t)}
                >
                  <Text style={[styles.chipText, { color: typeFilter === t ? colors.primary : colors.textSecondary }]}>
                    {t === 'all' ? 'All Types' : t === 'tryland' ? '🌳RYLAND' : 'Donate'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Error State */}
        {error && (
          <Card style={{ margin: Spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Ionicons name="lock-closed-outline" size={20} color="#EF4444" />
              <Text style={{ color: '#EF4444', flex: 1, fontSize: FontSize.sm }}>{error}</Text>
            </View>
          </Card>
        )}

        {/* Loading */}
        {loading && !error && (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 48 }} />
        )}

        {/* Empty */}
        {!loading && !error && payments.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={56} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Payments Found</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {statusFilter === 'pending' ? 'No pending payment submissions to review.' : 'No payments match the selected filters.'}
            </Text>
          </View>
        )}

        {/* Payment Cards */}
        {!loading && !error && payments.map(payment => (
          <Card key={payment.id} style={[styles.paymentCard, { borderColor: colors.border }]}>
            {/* Type + Status Row */}
            <View style={styles.cardTopRow}>
              <View style={[styles.typeBadge, { backgroundColor: payment.type === 'tryland' ? '#10B98118' : '#F59E0B18' }]}>
                <Text style={[styles.typeBadgeText, { color: payment.type === 'tryland' ? '#10B981' : '#F59E0B' }]}>
                  {payment.type === 'tryland' ? '🌳RYLAND' : '♥ Donate'}
                </Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: statusColor(payment.status) + '20' }]}>
                <Text style={[styles.statusPillText, { color: statusColor(payment.status) }]}>
                  {statusLabel(payment.status)}
                </Text>
              </View>
              {payment.is_duplicate_slip && (
                <View style={[styles.dupBadge]}>
                  <Ionicons name="warning-outline" size={12} color="#EF4444" />
                  <Text style={styles.dupText}>Dup. Slip</Text>
                </View>
              )}
            </View>

            {/* Target */}
            <Text style={[styles.targetTitle, { color: colors.text }]} numberOfLines={2}>
              {payment.target_title}
            </Text>

            {/* Amount + Reference */}
            <View style={[styles.amountRow, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
              <View>
                <Text style={[styles.cardAmountLabel, { color: colors.textTertiary }]}>Amount</Text>
                <Text style={[styles.cardAmount, { color: '#10B981' }]}>{formatThb(payment.amount)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.cardAmountLabel, { color: colors.textTertiary }]}>Reference</Text>
                <Text style={[styles.refMono, { color: colors.text }]}>{payment.payment_reference}</Text>
              </View>
            </View>

            {/* Submitter details */}
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {payment.submitter_name || '—'} · {payment.submitter_email}
              </Text>
            </View>

            {payment.slip_reference ? (
              <View style={styles.detailRow}>
                <Ionicons name="barcode-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  Bank Slip Ref: <Text style={{ fontWeight: FontWeight.semibold, color: colors.text }}>{payment.slip_reference}</Text>
                </Text>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                Submitted: {formatDate(payment.created_at)}
              </Text>
            </View>

            {payment.message ? (
              <View style={[styles.noteBox, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                <Text style={[styles.noteText, { color: colors.textSecondary }]}>"{payment.message}"</Text>
              </View>
            ) : null}

            {/* Verifier info */}
            {payment.verified_at && (
              <View style={styles.detailRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color={statusColor(payment.status)} />
                <Text style={[styles.detailText, { color: statusColor(payment.status) }]}>
                  {payment.status === 'verified' ? 'Verified' : 'Rejected'} by {payment.verifier_name || payment.verifier_email} on {formatDate(payment.verified_at)}
                </Text>
              </View>
            )}

            {payment.rejection_reason && (
              <View style={[styles.rejectNote, { backgroundColor: '#EF444414', borderColor: '#EF4444' }]}>
                <Text style={{ color: '#EF4444', fontSize: FontSize.xs }}>Rejection: {payment.rejection_reason}</Text>
              </View>
            )}

            {/* Action Buttons — only for pending */}
            {payment.status === 'pending' && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.rejectBtn, { borderColor: '#EF4444', backgroundColor: '#EF444414' }]}
                  onPress={() => { setRejectTarget(payment); setRejectReason(''); }}
                  disabled={verifying === payment.id}
                >
                  <Ionicons name="close-outline" size={18} color="#EF4444" />
                  <Text style={[styles.rejectBtnText]}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.approveBtn, { backgroundColor: verifying === payment.id ? '#6B7280' : '#10B981' }]}
                  onPress={() => handleApprove(payment)}
                  disabled={verifying === payment.id}
                >
                  {verifying === payment.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark-outline" size={18} color="#fff" />
                  )}
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>

      {/* Reject Reason Modal */}
      <Modal
        visible={!!rejectTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.rejectModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.rejectModalTitle, { color: colors.text }]}>Reject Payment</Text>
            <Text style={[styles.rejectModalSub, { color: colors.textSecondary }]}>
              Ref: {rejectTarget?.payment_reference}
            </Text>
            <Text style={[styles.fieldLabel2, { color: colors.text }]}>Rejection Reason *</Text>
            <View style={[styles.inputWrap2, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="e.g. Amount mismatch, unverifiable slip…"
                placeholderTextColor={colors.textTertiary}
                style={[{ color: colors.text, fontSize: FontSize.md, flex: 1 }]}
                multiline
                numberOfLines={3}
                autoFocus
              />
            </View>
            <View style={styles.rejectModalBtns}>
              <TouchableOpacity
                style={[styles.chip, { flex: 1, justifyContent: 'center', borderColor: colors.border }]}
                onPress={() => setRejectTarget(null)}
              >
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBtn, { flex: 1, backgroundColor: '#EF4444', justifyContent: 'center' }]}
                onPress={handleRejectConfirm}
                disabled={!!verifying}
              >
                {verifying ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.approveBtnText}>Reject</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  headerSub: { fontSize: FontSize.xs, marginTop: 1 },
  pendingBadge: {
    backgroundColor: '#F59E0B22',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  pendingBadgeText: { color: '#F59E0B', fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: FontSize.md },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    paddingTop: 64,
    gap: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center' },
  paymentCard: { margin: Spacing.sm, marginHorizontal: Spacing.lg, padding: Spacing.lg },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  typeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  typeBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  dupBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: '#EF444418',
  },
  dupText: { fontSize: 10, color: '#EF4444', fontWeight: FontWeight.semibold },
  targetTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  cardAmountLabel: { fontSize: FontSize.xs, marginBottom: 2 },
  cardAmount: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  refMono: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  detailText: { fontSize: FontSize.xs, flex: 1 },
  noteBox: { padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, marginVertical: Spacing.sm },
  noteText: { fontSize: FontSize.xs, fontStyle: 'italic' },
  rejectNote: { padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, marginTop: Spacing.sm },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1,
  },
  rejectBtnText: { color: '#EF4444', fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, padding: Spacing.md, borderRadius: BorderRadius.md,
  },
  approveBtnText: { color: '#fff', fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  rejectModal: { width: '100%', maxWidth: 420, padding: Spacing.xl, borderRadius: BorderRadius.xl, ...Shadow.lg },
  rejectModalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: 4 },
  rejectModalSub: { fontSize: FontSize.sm, marginBottom: Spacing.lg },
  fieldLabel2: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  inputWrap2: { borderWidth: 1.5, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, minHeight: 80 },
  rejectModalBtns: { flexDirection: 'row', gap: Spacing.md },
});

