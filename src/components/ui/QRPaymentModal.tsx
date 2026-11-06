/**
 * SPR QR Payment Modal
 * Shows the payment QR code, amount, unique transfer reference, and slip upload confirmation.
 * Works for both TRYLAND sponsorships and SPR Donate campaigns.
 *
 * IMPORTANT SECURITY CONTRACT:
 * - Payments are submitted with status = 'pending'
 * - Totals are NOT updated until an admin verifies the slip
 * - This component never claims payment is confirmed automatically
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { PAYMENT_QR } from '@/constants/assets';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface QRPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * What flow is this for?
   * tryland: Student bill sponsorship
   * donate: Donation campaign
   */
  mode: 'tryland' | 'donate';
  targetTitle: string;
  amountTHB: number;
  paymentReference: string;
  onConfirmPayment: (confirmData: {
    slip_reference: string;
    transfer_time: string;
    note?: string;
  }) => Promise<void>;
}

function formatThb(amount: number): string {
  return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function QRPaymentModal({
  visible,
  onClose,
  mode,
  targetTitle,
  amountTHB,
  paymentReference,
  onConfirmPayment,
}: QRPaymentModalProps) {
  const { colors, isDark } = useTheme();

  const [step, setStep] = useState<'scan' | 'confirm'>('scan');
  const [slipReference, setSlipReference] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setStep('scan');
    setSlipReference('');
    setTransferNote('');
    setSubmitting(false);
    onClose();
  }, [onClose]);

  const handleSubmitConfirmation = useCallback(async () => {
    if (!slipReference.trim() || slipReference.trim().length < 4) {
      Alert.alert('Required', 'Please enter the bank transfer reference number from your receipt.');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirmPayment({
        slip_reference: slipReference.trim(),
        transfer_time: new Date().toISOString(),
        note: transferNote.trim() || undefined,
      });
      setStep('scan');
      setSlipReference('');
      setTransferNote('');
      handleClose();
    } catch (err: any) {
      Alert.alert('Submission Failed', err?.message || 'Could not submit payment confirmation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [slipReference, transferNote, onConfirmPayment, handleClose]);

  const isQR = PAYMENT_QR;
  const qrSize = Math.min(SCREEN_W - 96, 280);

  const badgeColor = mode === 'tryland' ? '#10B981' : '#F59E0B';
  const badgeLabel = mode === 'tryland' ? '🌳RYLAND Sponsorship' : 'SPR Donate';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.badge, { backgroundColor: badgeColor + '18' }]}>
                <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>PromptPay QR Payment</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'scan' ? (
              <>
                {/* Static QR Notice Banner */}
                <View style={[styles.amountBox, { backgroundColor: isDark ? '#10B98118' : '#D1FAE5', borderColor: '#10B981' }]}>
                  <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount to Transfer Manually</Text>
                  <Text style={[styles.amountValue, { color: '#10B981' }]}>{formatThb(amountTHB)}</Text>
                  <Text style={[styles.amountTarget, { color: colors.textTertiary }]} numberOfLines={2}>
                    For: {targetTitle}
                  </Text>
                  <View style={[styles.staticPill, { backgroundColor: isDark ? '#F59E0B22' : '#FEF3C7', borderColor: '#F59E0B' }]}>
                    <Ionicons name="information-circle" size={13} color="#F59E0B" />
                    <Text style={[styles.staticPillText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                      Static QR (฿0.00) — Type {formatThb(amountTHB)} in your bank app
                    </Text>
                  </View>
                </View>

                {/* Payment Reference */}
                <View style={[styles.refBox, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                  <Ionicons name="barcode-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.refLabel, { color: colors.textTertiary }]}>Unique Payment Reference</Text>
                    <Text style={[styles.refValue, { color: colors.text }]}>{paymentReference}</Text>
                  </View>
                </View>

                {/* QR Code */}
                <View style={styles.qrContainer}>
                  <View style={[styles.qrFrame, { borderColor: '#10B981', backgroundColor: '#fff' }]}>
                    <Image
                      source={isQR}
                      style={{ width: qrSize, height: qrSize }}
                      resizeMode="contain"
                      accessibilityLabel="PromptPay QR Code — scan with your banking app"
                    />
                  </View>
                  <Text style={[styles.qrCaption, { color: colors.textSecondary }]}>
                    Scan with any Thai banking app
                  </Text>
                </View>

                {/* Instructions */}
                <View style={[styles.instructionBox, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                  <Text style={[styles.instructionTitle, { color: colors.text }]}>📋 Payment Instructions (Static PromptPay QR)</Text>
                  {[
                    `Open your mobile banking app (K PLUS, SCB Easy, Krungthai NEXT, etc.)`,
                    `Select "Scan QR" / "PromptPay"`,
                    `Scan the official static PromptPay QR code shown above`,
                    `CRITICAL: Manually enter the amount ${formatThb(amountTHB)} in your bank app (static QR default is ฿0.00)`,
                    `In the transfer memo/note, enter reference: ${paymentReference}`,
                    `Confirm transfer in your bank app and save your digital slip receipt`,
                    `Tap Continue below to submit your bank slip reference for administrator verification`,
                  ].map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={[styles.stepNumBg, { backgroundColor: '#10B98118' }]}>
                        <Text style={[styles.stepNum, { color: '#10B981' }]}>{i + 1}</Text>
                      </View>
                      <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
                    </View>
                  ))}
                </View>

                {/* Important notice */}
                <View style={[styles.noticeBox, { backgroundColor: isDark ? '#F59E0B14' : '#FEF3C7', borderColor: '#F59E0B' }]}>
                  <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
                  <Text style={[styles.noticeText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                    Your contribution is not counted toward funding until an administrator verifies your bank slip. This typically takes 1–24 hours on school days.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => setStep('confirm')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>I've Completed the Transfer →</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleClose} style={styles.cancelLink}>
                  <Text style={[styles.cancelLinkText, { color: colors.textTertiary }]}>Cancel — I'll pay later</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Step 2: Confirm transfer */}
                <View style={[styles.confirmHeader, { backgroundColor: '#10B98114', borderColor: '#10B981' }]}>
                  <Ionicons name="receipt-outline" size={28} color="#10B981" />
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text style={[styles.confirmTitle, { color: '#10B981' }]}>Submit Transfer Confirmation</Text>
                    <Text style={[styles.confirmSub, { color: colors.textSecondary }]}>
                      We need your bank slip reference to verify this payment.
                    </Text>
                  </View>
                </View>

                {/* Amount reminder */}
                <View style={[styles.amountMini, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                  <Text style={[styles.amountMiniLabel, { color: colors.textTertiary }]}>Amount Transferred</Text>
                  <Text style={[styles.amountMiniValue, { color: '#10B981' }]}>{formatThb(amountTHB)}</Text>
                </View>

                {/* Reference display */}
                <View style={[styles.refBox, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, marginBottom: Spacing.md }]}>
                  <Ionicons name="barcode-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.refLabel, { color: colors.textTertiary }]}>Your Payment Reference</Text>
                    <Text style={[styles.refValue, { color: colors.text }]}>{paymentReference}</Text>
                  </View>
                </View>

                {/* Bank Slip Reference Input */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Bank Slip Reference Number *
                  </Text>
                  <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
                    Found at the top of your bank app receipt (e.g., REF12345678)
                  </Text>
                  <View style={[styles.inputWrap, { borderColor: slipReference.trim().length >= 4 ? '#10B981' : colors.border, backgroundColor: colors.background }]}>
                    <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} style={{ marginRight: Spacing.sm }} />
                    <TextInput
                      value={slipReference}
                      onChangeText={setSlipReference}
                      placeholder="e.g. REF20261106001"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.input, { color: colors.text }]}
                      autoCapitalize="characters"
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {/* Optional note */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Additional Note (optional)</Text>
                  <View style={[styles.inputWrap, styles.textAreaWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <TextInput
                      value={transferNote}
                      onChangeText={setTransferNote}
                      placeholder="e.g. Transferred via KBank at 14:30"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.input, { color: colors.text }]}
                      multiline
                      numberOfLines={2}
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {/* Security notice */}
                <View style={[styles.noticeBox, { backgroundColor: isDark ? '#3B82F614' : '#EFF6FF', borderColor: '#3B82F6', marginBottom: Spacing.lg }]}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#3B82F6" />
                  <Text style={[styles.noticeText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                    Your submission is securely recorded. An administrator will verify your payment against the receiving account and approve it within 1–24 hours. You'll see a "Pending Verification" status until then.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: submitting ? '#6B7280' : '#10B981', opacity: submitting ? 0.75 : 1 },
                  ]}
                  onPress={handleSubmitConfirmation}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                  )}
                  <Text style={styles.primaryBtnText}>
                    {submitting ? 'Submitting…' : 'Submit for Verification'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep('scan')} style={styles.cancelLink}>
                  <Ionicons name="arrow-back-outline" size={14} color={colors.textTertiary} />
                  <Text style={[styles.cancelLinkText, { color: colors.textTertiary }]}> Back to QR Code</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '95%',
    ...Shadow.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: { flex: 1, marginRight: Spacing.sm },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xs,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  closeBtn: {
    padding: Spacing.xs,
    marginTop: 2,
  },
  body: {
    padding: Spacing.xl,
    paddingBottom: 48,
  },
  amountBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  amountLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.xs },
  amountValue: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },
  amountTarget: { fontSize: FontSize.xs, marginTop: Spacing.xs, textAlign: 'center' },
  staticPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  staticPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  refBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  refLabel: { fontSize: FontSize.xs, marginBottom: 2 },
  refValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  qrContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  qrFrame: {
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    marginBottom: Spacing.sm,
    ...Shadow.md,
  },
  qrCaption: { fontSize: FontSize.sm, textAlign: 'center' },
  instructionBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  instructionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  stepNumBg: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNum: { fontSize: 11, fontWeight: FontWeight.bold },
  stepText: { fontSize: FontSize.sm, flex: 1, lineHeight: 18 },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  noticeText: { fontSize: FontSize.xs, flex: 1, lineHeight: 16 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  primaryBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#fff' },
  cancelLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  cancelLinkText: { fontSize: FontSize.sm, textAlign: 'center' },
  // Step 2
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  confirmTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  confirmSub: { fontSize: FontSize.sm, marginTop: 2, lineHeight: 18 },
  amountMini: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  amountMiniLabel: { fontSize: FontSize.sm },
  amountMiniValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  fieldGroup: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: 4 },
  fieldHint: { fontSize: FontSize.xs, marginBottom: Spacing.sm, lineHeight: 16 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
  },
  textAreaWrap: { alignItems: 'flex-start', paddingTop: Spacing.md },
  input: { flex: 1, fontSize: FontSize.md },
});

