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
import { getAdminPayments, verifyAdminPayment, getAdminUsers, assignUserRole, getAdminAuditLogs } from '@/services/database/payments';
import { PaymentSubmission, AdminUserItem, AdminAuditLog } from '@/types/payments';
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

  // Admin section switcher: 'payments' | 'admins'
  const [activeSection, setActiveSection] = useState<'payments' | 'admins'>('payments');
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [assigningRole, setAssigningRole] = useState(false);

  const isOwner = user?.role === 'owner' || user?.email?.toLowerCase() === 'paulwanmarat@gmail.com';

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const list = await getAdminUsers();
      setAdminUsers(list);
    } catch (err: any) {
      console.warn('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'admins') {
      loadUsers();
    }
  }, [activeSection, loadUsers]);

  const handleAssignRole = useCallback(async (targetEmail: string, roleToAssign: 'admin' | 'user') => {
    if (!isOwner) {
      Alert.alert('Permission Denied', 'Only the Application Owner (paulwanmarat@gmail.com) can manage administrators.');
      return;
    }
    setAssigningRole(true);
    try {
      const res = await assignUserRole(targetEmail, roleToAssign);
      Alert.alert('Role Updated', res.message);
      setNewAdminEmail('');
      await loadUsers();
    } catch (err: any) {
      Alert.alert('Role Assignment Failed', err?.message || 'Could not update user role.');
    } finally {
      setAssigningRole(false);
    }
  }, [isOwner, loadUsers]);

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Center</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
            {isOwner ? '👑 Root Owner (paulwanmarat@gmail.com)' : '🛡️ Administrator Mode'}
          </Text>
        </View>
        {pendingCount > 0 && activeSection === 'payments' && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
          </View>
        )}
      </View>

      {/* Top Tab Bar: Payments vs Admins */}
      <View style={[styles.topTabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.topTabBtn, activeSection === 'payments' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveSection('payments')}
        >
          <Ionicons
            name="receipt-outline"
            size={16}
            color={activeSection === 'payments' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.topTabText, { color: activeSection === 'payments' ? colors.primary : colors.textSecondary }]}>
            Payments ({pendingCount} pending)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, activeSection === 'admins' && { borderBottomColor: '#F59E0B', borderBottomWidth: 2 }]}
          onPress={() => setActiveSection('admins')}
        >
          <Ionicons
            name="shield-checkmark"
            size={16}
            color={activeSection === 'admins' ? '#F59E0B' : colors.textSecondary}
          />
          <Text style={[styles.topTabText, { color: activeSection === 'admins' ? '#F59E0B' : colors.textSecondary, fontWeight: FontWeight.bold }]}>
            Manage Admins 👑
          </Text>
        </TouchableOpacity>
      </View>

      {activeSection === 'admins' ? (
        <ScrollView
          refreshControl={<RefreshControl refreshing={loadingUsers} onRefresh={loadUsers} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
        >
          {/* Owner Banner */}
          <Card style={[styles.ownerBannerCard, { borderColor: '#F59E0B', backgroundColor: '#F59E0B12' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Ionicons name="ribbon" size={28} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#D97706' }}>
                  Permanent Application Owner
                </Text>
                <Text style={{ fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: colors.text, marginTop: 2 }}>
                  paulwanmarat@gmail.com
                </Text>
              </View>
              <View style={[styles.ownerBadge, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.ownerBadgeText}>ROOT OWNER</Text>
              </View>
            </View>
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: Spacing.sm, lineHeight: 18 }}>
              {isOwner
                ? 'You have root ownership. You can appoint and revoke administrators at any time. All actions are logged with tamper-evident audit trails.'
                : 'Only the permanent Owner (paulwanmarat@gmail.com) can promote or revoke administrators. Regular administrators can review payments and view this directory in read-only mode.'}
            </Text>
          </Card>

          {/* Add New Admin Form (Owner only) */}
          {isOwner && (
            <Card style={{ marginTop: Spacing.lg, padding: Spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs }}>
                <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                <Text style={{ fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.text }}>
                  Appoint New Administrator
                </Text>
              </View>
              <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginBottom: Spacing.md }}>
                Enter the email address of a registered user to grant them administrative privileges.
              </Text>

              <View style={[styles.searchWrap, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: Spacing.md }]}>
                <Ionicons name="mail-outline" size={16} color={colors.textTertiary} />
                <TextInput
                  value={newAdminEmail}
                  onChangeText={setNewAdminEmail}
                  placeholder="e.g. colleague@university.ac.th"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.searchInput, { color: colors.text }]}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.approveBtn,
                  {
                    backgroundColor: newAdminEmail.trim() ? colors.primary : colors.border,
                    opacity: assigningRole ? 0.7 : 1,
                  },
                ]}
                disabled={!newAdminEmail.trim() || assigningRole}
                onPress={() => {
                  const target = newAdminEmail.trim();
                  Alert.alert(
                    'Confirm Admin Appointment',
                    `Grant Administrator privileges to "${target}"?\n\nThey will be able to verify QR code payments and review financial submissions.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Grant Admin Role',
                        style: 'default',
                        onPress: () => handleAssignRole(target, 'admin'),
                      },
                    ]
                  );
                }}
              >
                {assigningRole ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={16} color="#fff" />
                    <Text style={styles.approveBtnText}>Grant Administrator Privileges</Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>
          )}

          {/* Users Directory */}
          <View style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.text }}>
              User & Administrator Directory ({adminUsers.length})
            </Text>
            <TouchableOpacity onPress={loadUsers} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="refresh-outline" size={14} color={colors.primary} />
              <Text style={{ fontSize: FontSize.xs, color: colors.primary, fontWeight: FontWeight.semibold }}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingUsers && adminUsers.length === 0 ? (
            <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 32 }} />
          ) : adminUsers.length === 0 ? (
            <Card style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Ionicons name="people-outline" size={36} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, marginTop: Spacing.sm }}>No registered users found.</Text>
            </Card>
          ) : (
            adminUsers.map(u => {
              const userIsRootOwner = u.email.toLowerCase() === 'paulwanmarat@gmail.com' || u.role === 'owner';
              const userIsAdmin = u.role === 'admin';

              return (
                <Card key={u.id} style={{ marginBottom: Spacing.md, padding: Spacing.md, borderColor: userIsRootOwner ? '#F59E0B' : userIsAdmin ? '#3B82F6' : colors.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                    <View
                      style={[
                        styles.avatarCircle,
                        {
                          backgroundColor: userIsRootOwner
                            ? '#FEF3C7'
                            : userIsAdmin
                            ? '#DBEAFE'
                            : colors.surfaceHighlight,
                        },
                      ]}
                    >
                      <Ionicons
                        name={userIsRootOwner ? 'ribbon' : userIsAdmin ? 'shield-checkmark' : 'person-outline'}
                        size={20}
                        color={userIsRootOwner ? '#D97706' : userIsAdmin ? '#2563EB' : colors.textSecondary}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.text }}>
                          {u.username || u.email.split('@')[0]}
                        </Text>

                        {userIsRootOwner ? (
                          <View style={[styles.roleTag, { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' }]}>
                            <Text style={[styles.roleTagText, { color: '#D97706' }]}>👑 OWNER</Text>
                          </View>
                        ) : userIsAdmin ? (
                          <View style={[styles.roleTag, { backgroundColor: '#3B82F622', borderColor: '#3B82F6' }]}>
                            <Text style={[styles.roleTagText, { color: '#2563EB' }]}>🛡️ ADMIN</Text>
                          </View>
                        ) : (
                          <View style={[styles.roleTag, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                            <Text style={[styles.roleTagText, { color: colors.textTertiary }]}>USER</Text>
                          </View>
                        )}
                      </View>

                      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                        {u.email}
                      </Text>

                      <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 4 }}>
                        Joined: {formatDate(u.created_at)}
                      </Text>
                    </View>

                    {/* Role Actions (Owner Only) */}
                    {isOwner && !userIsRootOwner && (
                      <View>
                        {userIsAdmin ? (
                          <TouchableOpacity
                            style={[styles.roleActionBtn, { borderColor: '#EF4444', backgroundColor: '#EF444414' }]}
                            onPress={() => {
                              Alert.alert(
                                'Revoke Admin Role',
                                `Revoke administrator privileges from ${u.email}? They will return to standard user permissions.`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Revoke Admin',
                                    style: 'destructive',
                                    onPress: () => handleAssignRole(u.email, 'user'),
                                  },
                                ]
                              );
                            }}
                            disabled={assigningRole}
                          >
                            <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                            <Text style={{ color: '#EF4444', fontSize: FontSize.xs, fontWeight: FontWeight.semibold }}>
                              Revoke
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.roleActionBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '14' }]}
                            onPress={() => {
                              Alert.alert(
                                'Make Administrator',
                                `Promote ${u.email} to Administrator?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Promote',
                                    style: 'default',
                                    onPress: () => handleAssignRole(u.email, 'admin'),
                                  },
                                ]
                              );
                            }}
                            disabled={assigningRole}
                          >
                            <Ionicons name="shield-outline" size={14} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold }}>
                              Make Admin
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      ) : (
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
      )}

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
  topTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  topTabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  ownerBannerCard: {
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
  },
  ownerBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  ownerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTag: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  roleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});

