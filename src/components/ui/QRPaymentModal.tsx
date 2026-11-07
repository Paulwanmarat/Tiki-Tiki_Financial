/**
 * SPR QR Payment Modal
 * Shows the payment QR code, amount, unique transfer reference, and slip upload confirmation.
 * Works for both RK (Rich Kid) bill sponsorships and SPR Donate campaigns.
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
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { PAYMENT_QR } from '@/constants/assets';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { scanBankSlip } from '@/services/ocr/scanner';

const { width: SCREEN_W } = Dimensions.get('window');

interface QRPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * What flow is this for?
   * tryland: 🌳 TRYLAND Save the planet initiative (Plant Trees)
   * rk: RK (Rich Kid) student bill sponsorship
   * donate: SPR Donate campaign
   */
  mode: 'tryland' | 'rk' | 'donate';
  targetTitle: string;
  amountTHB: number;
  paymentReference: string;
  onConfirmPayment: (confirmData: {
    slip_reference: string;
    transfer_time: string;
    note?: string;
    guest_name?: string;
    guest_email?: string;
    slip_url?: string;
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

  const [step, setStep] = useState<'scan' | 'confirm' | 'success'>('scan');
  const [slipReference, setSlipReference] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [guestName, setGuestName] = useState('');
  const [slipImageUri, setSlipImageUri] = useState<string | null>(null);
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [scanningSlip, setScanningSlip] = useState(false);
  const [ocrResultMsg, setOcrResultMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setStep('scan');
    setSlipReference('');
    setTransferNote('');
    setGuestName('');
    setSlipImageUri(null);
    setSlipUrl(null);
    setScanningSlip(false);
    setOcrResultMsg(null);
    setSubmitError(null);
    setSubmitting(false);
    onClose();
  }, [onClose]);

  const handlePickSlip = useCallback(async (useCamera: boolean = false) => {
    setSubmitError(null);
    try {
      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        if (Platform.OS !== 'web') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permission Needed', 'Camera access is required to take a picture of your bank receipt.');
            return;
          }
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.9,
        });
      } else {
        if (Platform.OS !== 'web') {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permission Needed', 'Photo gallery access is required to select your bank receipt.');
            return;
          }
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.9,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setSlipImageUri(uri);
        setScanningSlip(true);
        setOcrResultMsg(null);

        try {
          const scanResult = await scanBankSlip(uri);
          if (scanResult && scanResult.reference_number) {
            setSlipReference(scanResult.reference_number);
            if (scanResult.sender_name && !guestName) {
              setGuestName(scanResult.sender_name);
            }
            if (scanResult.channel && !transferNote) {
              setTransferNote(scanResult.channel);
            }
            if (scanResult.slip_url) {
              setSlipUrl(scanResult.slip_url);
            }
            setOcrResultMsg(`✓ Reference #${scanResult.reference_number} auto-detected`);
          } else {
            setOcrResultMsg('Receipt attached. Please verify or type the reference number below.');
          }
        } catch (err: any) {
          console.warn('Bank slip scan error:', err);
          setOcrResultMsg('Receipt attached. You can type the reference number below.');
        } finally {
          setScanningSlip(false);
        }
      }
    } catch (e: any) {
      console.error('Image selection error:', e);
      setSubmitError('Could not load image. You can still manually enter the reference number below.');
    }
  }, [guestName, transferNote]);

  const handleSubmitConfirmation = useCallback(async () => {
    setSubmitError(null);
    if (!slipReference.trim() || slipReference.trim().length < 4) {
      setSubmitError('Please enter the bank transfer reference number or attach your bank receipt above.');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirmPayment({
        slip_reference: slipReference.trim(),
        transfer_time: new Date().toISOString(),
        note: transferNote.trim() || undefined,
        guest_name: guestName.trim() || undefined,
        slip_url: slipUrl || undefined,
      });
      // Move to success step with full confirmation details
      setStep('success');
    } catch (err: any) {
      console.error('Submit confirmation error:', err);
      const msg = err?.message || 'Could not submit payment confirmation. Please try again.';
      setSubmitError(msg);
      if (Platform.OS !== 'web') {
        Alert.alert('Submission Issue', msg);
      }
    } finally {
      setSubmitting(false);
    }
  }, [slipReference, transferNote, guestName, slipUrl, onConfirmPayment]);

  const isQR = PAYMENT_QR;
  const qrSize = Math.min(SCREEN_W - 96, 280);

  const badgeColor = mode === 'tryland' ? '#059669' : mode === 'rk' ? '#10B981' : '#F59E0B';
  const badgeLabel =
    mode === 'tryland'
      ? '🌳 TRYLAND · Plant Trees'
      : mode === 'rk'
      ? 'RK (Rich Kid) Sponsorship'
      : '♥ SPR Donate';

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
              <View style={[styles.badge, { backgroundColor: badgeColor + '18', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                {mode === 'tryland' && (
                  <Text style={{ fontSize: 13, lineHeight: 16 }}>🌳</Text>
                )}
                {mode === 'rk' && (
                  <Ionicons name="happy" size={13} color={badgeColor} />
                )}
                <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {step === 'success' ? 'Verification Submitted' : 'PromptPay QR Payment'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {/* ══════════════════════════════════════════════════════════ */}
            {/* STEP 1: SCAN QR CODE                                     */}
            {/* ══════════════════════════════════════════════════════════ */}
            {step === 'scan' && (
              <>
                {/* Selected Amount Banner */}
                <View style={[styles.amountBox, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                  <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount to Transfer</Text>
                  <Text style={[styles.amountValue, { color: '#10B981' }]}>{formatThb(amountTHB)}</Text>
                  <Text style={[styles.amountTarget, { color: colors.textTertiary }]} numberOfLines={1}>
                    For: {targetTitle}
                  </Text>
                  <View style={[styles.staticPill, { backgroundColor: '#F59E0B14', borderColor: '#F59E0B' }]}>
                    <Ionicons name="alert-circle-outline" size={13} color="#D97706" />
                    <Text style={[styles.staticPillText, { color: '#D97706' }]}>
                      Static Thai PromptPay QR (฿0.00) — Enter exact amount in your bank app
                    </Text>
                  </View>
                </View>

                {/* Unique Payment Reference */}
                <View style={[styles.refBox, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                  <Ionicons name="barcode-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.refLabel, { color: colors.textTertiary }]}>Your Unique Payment Reference</Text>
                    <Text style={[styles.refValue, { color: colors.text }]} selectable>
                      {paymentReference}
                    </Text>
                  </View>
                </View>

                {/* QR Code Display */}
                <View style={styles.qrContainer}>
                  <View style={[styles.qrFrame, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                    <Image
                      source={isQR}
                      style={{ width: qrSize, height: qrSize }}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={[styles.qrCaption, { color: colors.textSecondary }]}>
                    Scan with any Thai Banking App (K PLUS, SCB EASY, Krungthai NEXT, TrueMoney, etc.)
                  </Text>
                </View>

                {/* Clear Payment Instructions */}
                <View style={[styles.instructionBox, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                  <Text style={[styles.instructionTitle, { color: colors.text }]}>Instructions to Pay</Text>
                  <View style={styles.stepRow}>
                    <View style={[styles.stepNumBg, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.stepNum, { color: '#fff' }]}>1</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.text }]}>
                      Open your bank app, tap <Text style={{ fontWeight: FontWeight.bold }}>Scan QR</Text>, and point camera at the PromptPay QR code above.
                    </Text>
                  </View>
                  <View style={styles.stepRow}>
                    <View style={[styles.stepNumBg, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.stepNum, { color: '#fff' }]}>2</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.text }]}>
                      Enter the exact amount: <Text style={{ fontWeight: FontWeight.bold, color: '#10B981' }}>{formatThb(amountTHB)}</Text>.
                    </Text>
                  </View>
                  <View style={styles.stepRow}>
                    <View style={[styles.stepNumBg, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.stepNum, { color: '#fff' }]}>3</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.text }]}>
                      Put <Text style={{ fontWeight: FontWeight.bold }}>{paymentReference}</Text> in the transfer note for faster verification.
                    </Text>
                  </View>
                  <View style={styles.stepRow}>
                    <View style={[styles.stepNumBg, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.stepNum, { color: '#fff' }]}>4</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.text }]}>
                      Complete the transfer and save the receipt / bank slip.
                    </Text>
                  </View>
                </View>

                {/* Action Button to Proceed */}
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => setStep('confirm')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>I Have Transferred → Submit Slip</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleClose} style={styles.cancelLink}>
                  <Text style={[styles.cancelLinkText, { color: colors.textTertiary }]}>Cancel Payment</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* STEP 2: CONFIRM TRANSFER & SUBMIT EVIDENCE               */}
            {/* ══════════════════════════════════════════════════════════ */}
            {step === 'confirm' && (
              <>
                <View style={[styles.confirmHeader, { backgroundColor: '#10B98114', borderColor: '#10B981' }]}>
                  <Ionicons name="document-text-outline" size={24} color="#10B981" style={{ marginRight: 10, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.confirmTitle, { color: colors.text }]}>Submit Transfer Confirmation</Text>
                    <Text style={[styles.confirmSub, { color: colors.textSecondary }]}>
                      We need your bank slip reference to verify this payment against receiving records.
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

                {/* File Attachment & Auto-Read Bank Receipt */}
                <View style={[styles.slipAttachCard, { backgroundColor: colors.surfaceHighlight, borderColor: slipImageUri ? '#10B981' : colors.border }]}>
                  <View style={styles.slipCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Ionicons name="receipt-outline" size={18} color="#10B981" />
                      <Text style={[styles.slipCardTitle, { color: colors.text }]}>Attach Bank Slip (Auto-Read)</Text>
                    </View>
                    <View style={[styles.autoBadge, { backgroundColor: '#10B9811A' }]}>
                      <Ionicons name="flash" size={11} color="#10B981" />
                      <Text style={styles.autoBadgeText}>AI Auto-Scan</Text>
                    </View>
                  </View>
                  <Text style={[styles.slipCardSub, { color: colors.textTertiary }]}>
                    Attach your bank transfer receipt screenshot. We will automatically read and fill the reference number without errors.
                  </Text>

                  {slipImageUri ? (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: slipImageUri }} style={styles.slipPreview} resizeMode="cover" />
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        {scanningSlip ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <ActivityIndicator size="small" color="#10B981" />
                            <Text style={[styles.scanningText, { color: colors.textSecondary }]}>Reading receipt reference...</Text>
                          </View>
                        ) : ocrResultMsg ? (
                          <View style={{ gap: 4 }}>
                            <Text style={[styles.ocrResultText, { color: ocrResultMsg.startsWith('✓') ? '#10B981' : colors.textSecondary }]}>
                              {ocrResultMsg}
                            </Text>
                            <TouchableOpacity onPress={() => { setSlipImageUri(null); setOcrResultMsg(null); }} style={styles.changeSlipBtn}>
                              <Text style={{ color: '#EF4444', fontSize: FontSize.xs, fontWeight: FontWeight.semibold }}>Remove / Choose Another</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.attachBtnRow}>
                      <TouchableOpacity
                        style={[styles.attachBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={() => handlePickSlip(false)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="images-outline" size={18} color="#10B981" />
                        <Text style={[styles.attachBtnText, { color: colors.text }]}>Attach Receipt Slip</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.attachBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={() => handlePickSlip(true)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="camera-outline" size={18} color="#10B981" />
                        <Text style={[styles.attachBtnText, { color: colors.text }]}>Camera</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Bank Slip Reference Input */}
                <View style={styles.fieldGroup}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[styles.fieldLabel, { color: colors.text, marginBottom: 0 }]}>
                      Bank Slip Reference Number *
                    </Text>
                    {slipReference.trim().length >= 4 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={{ fontSize: FontSize.xs, color: '#10B981', fontWeight: FontWeight.semibold }}>Valid Reference</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
                    Auto-filled from attached receipt, or enter manually below (e.g., 50060248100418)
                  </Text>
                  <View style={[styles.inputWrap, { borderColor: slipReference.trim().length >= 4 ? '#10B981' : colors.border, backgroundColor: colors.background }]}>
                    <Ionicons name="document-text-outline" size={18} color={slipReference.trim().length >= 4 ? '#10B981' : colors.textSecondary} style={{ marginRight: Spacing.sm }} />
                    <TextInput
                      value={slipReference}
                      onChangeText={(t) => { setSlipReference(t); setSubmitError(null); }}
                      placeholder="e.g. 50060248100418"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.input, { color: colors.text }]}
                      autoCapitalize="characters"
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {/* Optional Supporter Name */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Your Name / Supporter Name (optional)</Text>
                  <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={{ marginRight: Spacing.sm }} />
                    <TextInput
                      value={guestName}
                      onChangeText={setGuestName}
                      placeholder="e.g. Anthony Ferrer"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.input, { color: colors.text }]}
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
                      placeholder="e.g. TrueMoney wallet transfer"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.input, { color: colors.text }]}
                      multiline
                      numberOfLines={2}
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {/* In-Modal Error Display */}
                {submitError && (
                  <View style={[styles.errorBox, { backgroundColor: '#EF444418', borderColor: '#EF4444' }]}>
                    <Ionicons name="alert-circle" size={18} color="#EF4444" />
                    <Text style={[styles.errorText, { color: '#EF4444' }]}>{submitError}</Text>
                  </View>
                )}

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

            {/* ══════════════════════════════════════════════════════════ */}
            {/* STEP 3: SUCCESS CONFIRMATION SCREEN                      */}
            {/* ══════════════════════════════════════════════════════════ */}
            {step === 'success' && (
              <View style={styles.successContainer}>
                <View style={styles.successIconWrap}>
                  <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                </View>
                <Text style={[styles.successTitle, { color: colors.text }]}>Verification Submitted!</Text>
                <Text style={[styles.successSub, { color: colors.textSecondary }]}>
                  Thank you for your generous support! Your transfer confirmation has been securely queued.
                </Text>

                {/* Receipt Details Card */}
                <View style={[styles.successCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                  <View style={styles.successRow}>
                    <Text style={[styles.successLabel, { color: colors.textTertiary }]}>Target</Text>
                    <Text style={[styles.successValue, { color: colors.text }]} numberOfLines={1}>{targetTitle}</Text>
                  </View>
                  <View style={styles.successRow}>
                    <Text style={[styles.successLabel, { color: colors.textTertiary }]}>Amount</Text>
                    <Text style={[styles.successValue, { color: '#10B981', fontWeight: FontWeight.bold }]}>{formatThb(amountTHB)}</Text>
                  </View>
                  <View style={styles.successRow}>
                    <Text style={[styles.successLabel, { color: colors.textTertiary }]}>Payment Ref</Text>
                    <Text style={[styles.successValueMono, { color: colors.text }]}>{paymentReference}</Text>
                  </View>
                  {slipReference ? (
                    <View style={styles.successRow}>
                      <Text style={[styles.successLabel, { color: colors.textTertiary }]}>Slip Ref</Text>
                      <Text style={[styles.successValueMono, { color: colors.text }]}>{slipReference}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.successRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.successLabel, { color: colors.textTertiary }]}>Initial Status</Text>
                    <View style={[styles.statusTag, { backgroundColor: '#F59E0B20' }]}>
                      <Text style={{ color: '#D97706', fontSize: 11, fontWeight: FontWeight.bold }}>⏳ Pending Verification</Text>
                    </View>
                  </View>
                </View>

                {/* Helpful explanatory banner */}
                <View style={[styles.noticeBox, { backgroundColor: isDark ? '#10B98114' : '#ECFDF5', borderColor: '#10B981', marginBottom: Spacing.xl }]}>
                  <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                  <Text style={[styles.noticeText, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
                    An administrator will verify your receipt against the receiving bank account. The funding totals will update immediately upon approval.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: '#10B981' }]}
                  onPress={handleClose}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-outline" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
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
  slipAttachCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  slipCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  slipCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  slipCardSub: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.sm,
    lineHeight: 16,
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  autoBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#10B981',
  },
  attachBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  attachBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  attachBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  slipPreview: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: '#E5E7EB',
  },
  ocrResultText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  scanningText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  changeSlipBtn: {
    marginTop: 4,
  },
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  // Step 3 (Success)
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  successIconWrap: {
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  successSub: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
    maxWidth: 320,
  },
  successCard: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  successLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  successValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    maxWidth: '65%',
    textAlign: 'right',
  },
  successValueMono: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
