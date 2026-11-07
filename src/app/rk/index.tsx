import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  useWindowDimensions,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { RKWordmark } from '@/components/ui/RKWordmark';
import { QRPaymentModal } from '@/components/ui/QRPaymentModal';
import { getTrylandRequests, sponsorTrylandBill } from '@/services/database/tryland';
import { TrylandRequest, TrylandCategory } from '@/types/tryland';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { formatDate } from '@/utils/formatters';

const CATEGORIES: ('All' | TrylandCategory)[] = [
  'All',
  'Educational expenses',
  'School supplies',
  'Learning equipment',
  'School-related activities',
  'Essential student bills',
];

export default function RKHomeScreen() {
  const { colors, isDark } = useTheme();
  const { formatCurrency, currency, convertToBase } = useCurrency();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [requests, setRequests] = useState<TrylandRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'All' | TrylandCategory>('All');

  // Sponsorship modal
  const [activeRequest, setActiveRequest] = useState<TrylandRequest | null>(null);
  const [sponsorAmount, setSponsorAmount] = useState('');
  const [sponsorNote, setSponsorNote] = useState('Keep studying hard! You got this.');
  const [showQR, setShowQR] = useState(false);
  const [pendingPayRef, setPendingPayRef] = useState('');
  const [submittingPledge, setSubmittingPledge] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTrylandRequests({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
      });
      setRequests(data);
    } catch (err) {
      console.error('Failed to load Tryland requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleOpenSponsorModal = (req: TrylandRequest) => {
    setActiveRequest(req);
    const needed = Math.max(0, req.amount_requested - req.amount_funded);
    setSponsorAmount(Math.min(needed, 500).toString());
  };

  // Step 1: User enters amount → generate pay reference → show QR
  const handleProceedToQR = useCallback(() => {
    if (!activeRequest) return;
    const numAmt = parseFloat(sponsorAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid sponsorship amount.');
      return;
    }
    // Generate a unique payment reference for this sponsorship
    const ref = `RK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setPendingPayRef(ref);
    setShowQR(true);
  }, [activeRequest, sponsorAmount]);

  // Step 2: User confirms transfer — submit with pending status
  const handleQRConfirm = useCallback(async (confirmData: {
    slip_reference: string;
    transfer_time: string;
    note?: string;
    guest_name?: string;
  }) => {
    if (!activeRequest) return;
    const numAmt = parseFloat(sponsorAmount);
    const baseAmt = convertToBase(numAmt);
    await sponsorTrylandBill(activeRequest.id, {
      amount: baseAmt,
      note: confirmData.note || sponsorNote,
      slip_reference: confirmData.slip_reference,
      transfer_time: confirmData.transfer_time,
      payment_reference: pendingPayRef,
      guest_name: confirmData.guest_name,
    });
    loadRequests();
  }, [activeRequest, sponsorAmount, sponsorNote, pendingPayRef, convertToBase, loadRequests]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Header with stylized RK wordmark */}
      <View style={[styles.topHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.topHeaderLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <RKWordmark size="md" showSubtitle />
        </View>

        <View style={styles.topHeaderRight}>
          <TouchableOpacity
            style={[styles.myRequestsBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => router.push('/rk/my-requests' as any)}
          >
            <Ionicons name="receipt-outline" size={15} color={colors.text} />
            <Text style={[styles.myRequestsText, { color: colors.text }]}>My Bills</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.newRequestBtn, { backgroundColor: '#10B981' }]}
            onPress={() => router.push('/rk/request' as any)}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#FFF" />
            <Text style={styles.newRequestBtnText}>Upload Bill</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Mission Card */}
      <View style={[styles.missionBanner, { backgroundColor: '#10B981' + '12', borderColor: '#10B981' + '30' }]}>
        <Ionicons name="shield-checkmark" size={20} color="#10B981" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.missionTitle, { color: colors.text }]}>RK · Rich Kid Bill Sponsorship</Text>
          <Text style={[styles.missionDesc, { color: colors.textSecondary }]}>
            Where students upload their bills and Rich Kids can pay them! Verified student bills sponsored directly via PromptPay QR. All requests are verified by administrators.
          </Text>
        </View>
      </View>

      {/* 3. Category Carousel */}
      <View style={[styles.categoryBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  { borderColor: isSelected ? '#10B981' : colors.border },
                  isSelected && { backgroundColor: '#10B981' + '18' },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: isSelected ? '#10B981' : colors.textSecondary },
                    isSelected && { fontWeight: FontWeight.bold },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Requests Stream */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading student support requests...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="happy" size={52} color="#10B981" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No student bills in this category</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              All submitted student requests in this category are fully funded or undergoing review.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: '#10B981' }]}
              onPress={() => router.push('/rk/request' as any)}
            >
              <Text style={styles.emptyBtnText}>Upload a Student Bill</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.grid, isDesktop && styles.desktopGrid]}>
            {requests.map((req) => {
              const isFullyFunded = req.amount_funded >= req.amount_requested;
              const pct = Math.min(100, Math.round((req.amount_funded / req.amount_requested) * 100));
              const remaining = Math.max(0, req.amount_requested - req.amount_funded);

              return (
                <View
                  key={req.id}
                  style={[
                    styles.requestCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isDesktop && styles.desktopCard,
                  ]}
                >
                  {/* Card Header: Category & Student Alias */}
                  <View style={styles.reqCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.categoryBadge, { color: '#10B981', backgroundColor: '#10B981' + '18' }]}>
                        {req.bill_category.toUpperCase()}
                      </Text>
                      <Text style={[styles.studentAlias, { color: colors.text }]}>
                        👤 {req.student_alias}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: isFullyFunded ? colors.success + '20' : '#10B981' + '18' }]}>
                      <Text style={[styles.statusBadgeText, { color: isFullyFunded ? colors.success : '#10B981' }]}>
                        {isFullyFunded ? 'FULLY FUNDED' : `${pct}% FUNDED`}
                      </Text>
                    </View>
                  </View>

                  {/* Explanation */}
                  <Text style={[styles.explanationText, { color: colors.text }]} numberOfLines={3}>
                    "{req.explanation || 'Verified educational bill assistance needed before term deadline.'}"
                  </Text>

                  {/* Funding Progress Bar */}
                  <View style={styles.progressSection}>
                    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceHighlight }]}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: '#10B981' }]} />
                    </View>
                    <View style={styles.progressRow}>
                      <Text style={[styles.progressNum, { color: colors.text }]}>
                        Raised: <Text style={{ fontWeight: FontWeight.extrabold }}>{formatCurrency(req.amount_funded)}</Text>
                      </Text>
                      <Text style={[styles.progressNum, { color: colors.textSecondary }]}>
                        Goal: {formatCurrency(req.amount_requested)}
                      </Text>
                    </View>
                  </View>

                  {/* Footer & Due Date */}
                  <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.dueDateBox}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
                      <Text style={[styles.dueDateText, { color: colors.textTertiary }]}>
                        Due {formatDate(req.due_date)}
                      </Text>
                    </View>

                    {!isFullyFunded ? (
                      <TouchableOpacity
                        style={[styles.sponsorBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => handleOpenSponsorModal(req)}
                      >
                        <Ionicons name="card" size={14} color="#FFF" />
                        <Text style={styles.sponsorBtnText}>Pay Bill (Rich Kid)</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.completedPill}>
                        <Ionicons name="checkmark-done" size={14} color={colors.success} />
                        <Text style={[styles.completedPillText, { color: colors.success }]}>Fully Paid</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 1: Amount selection modal                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={!!activeRequest && !showQR}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveRequest(null)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardWrap}
          >
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="happy" size={22} color="#10B981" />
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Pay Student Bill · Rich Kid</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveRequest(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {activeRequest && (
                  <>
                    <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                      Sponsoring bill for <Text style={{ fontWeight: FontWeight.bold, color: colors.text }}>{activeRequest.student_alias}</Text> ({activeRequest.bill_category}).
                      Remaining needed: {formatCurrency(activeRequest.amount_requested - activeRequest.amount_funded)}.
                    </Text>

                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                      Pledge Amount ({currency.symbol})
                    </Text>
                    <View style={[styles.amountInputWrap, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                      <Text style={[styles.currPrefix, { color: colors.textTertiary }]}>{currency.symbol}</Text>
                      <TextInput
                        style={[styles.amountInput, { color: colors.text }]}
                        value={sponsorAmount}
                        onChangeText={setSponsorAmount}
                        keyboardType="numeric"
                      />
                    </View>

                    {/* Quick Presets */}
                    <View style={styles.presetsRow}>
                      {[100, 250, 500, 1000].map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          style={[styles.presetBtn, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
                          onPress={() => setSponsorAmount(amt.toString())}
                        >
                          <Text style={[styles.presetText, { color: colors.text }]}>+{currency.symbol}{amt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 8 }]}>
                      Encouragement Message for Student (Optional)
                    </Text>
                    <TextInput
                      style={[styles.modalInput, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, color: colors.text }]}
                      value={sponsorNote}
                      onChangeText={setSponsorNote}
                      placeholder="e.g. Keep up the good work!"
                      placeholderTextColor={colors.textTertiary}
                    />

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                        onPress={() => setActiveRequest(null)}
                      >
                        <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalSubmitBtn, { backgroundColor: '#10B981' }]}
                        onPress={handleProceedToQR}
                      >
                        <Ionicons name="qr-code-outline" size={16} color="#fff" />
                        <Text style={styles.modalSubmitText}>Scan to Pay →</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* STEP 2: QR Payment Modal */}
      {activeRequest && (
        <QRPaymentModal
          visible={showQR}
          onClose={() => {
            setShowQR(false);
            setActiveRequest(null);
            setSponsorAmount('');
            loadRequests();
          }}
          mode="rk"
          targetTitle={`${activeRequest.student_alias} · ${activeRequest.bill_category}`}
          amountTHB={convertToBase(parseFloat(sponsorAmount) || 0)}
          paymentReference={pendingPayRef}
          onConfirmPayment={handleQRConfirm}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  myRequestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  myRequestsText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  newRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  newRequestBtnText: {
    color: '#FFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  missionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  missionTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  missionDesc: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  categoryBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
    marginTop: Spacing.xs,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: FontSize.xs,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
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
  },
  emptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  grid: {
    gap: 12,
  },
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  requestCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: 4,
  },
  desktopCard: {
    width: '48.5%',
  },
  reqCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryBadge: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  studentAlias: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  explanationText: {
    fontSize: FontSize.xs + 1,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressNum: {
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dueDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dueDateText: {
    fontSize: 10,
  },
  sponsorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
  },
  sponsorBtnText: {
    color: '#FFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedPillText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 460,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  modalScrollContent: {
    padding: Spacing.lg,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  modalDesc: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 6,
  },
  currPrefix: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  amountInput: {
    flex: 1,
    height: '100%',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  modalInput: {
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: FontSize.xs + 1,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: FontSize.xs + 1,
  },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    minWidth: 90,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#FFF',
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
});

