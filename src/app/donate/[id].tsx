import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { QRPaymentModal } from '@/components/ui/QRPaymentModal';
import { getDonateCampaignById, submitDonation } from '@/services/database/donate';
import { DonateCampaign } from '@/types/donate';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatDate } from '@/utils/formatters';

export default function DonateDetailScreen() {
  const { colors, isDark } = useTheme();
  const { formatCurrency, currency, convertToBase } = useCurrency();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [campaign, setCampaign] = useState<DonateCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Donation Modal State
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState('250');
  const [donationMessage, setDonationMessage] = useState('Glad to support this student cause!');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submittingDonation, setSubmittingDonation] = useState(false);

  // QR Payment state
  const [showQR, setShowQR] = useState(false);
  const [pendingPayRef, setPendingPayRef] = useState('');

  const loadCampaign = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getDonateCampaignById(id);
      setCampaign(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // Step 1: User fills in amount → move to QR scan
  const handleProceedToQR = () => {
    if (!campaign) return;
    const numAmt = parseFloat(donationAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid donation amount.');
      return;
    }
    const ref = `DON-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setPendingPayRef(ref);
    setShowDonateModal(false);
    setShowQR(true);
  };

  // Step 2: User confirms transfer — submit with pending status
  const handleQRConfirm = useCallback(async (confirmData: {
    slip_reference: string;
    transfer_time: string;
    note?: string;
  }) => {
    if (!campaign) return;
    const numAmt = parseFloat(donationAmount);
    const baseAmt = convertToBase(numAmt);
    await submitDonation(campaign.id, {
      amount: baseAmt,
      message: donationMessage.trim(),
      is_anonymous: isAnonymous,
      slip_reference: confirmData.slip_reference,
      transfer_time: confirmData.transfer_time,
      payment_reference: pendingPayRef,
    });
    setShowQR(false);
    setDonationAmount('250');
    Alert.alert(
      '💖 Donation Submitted',
      'Your donation is Pending Verification. An administrator will review your bank slip within 24 hours. The campaign total will update after approval.',
      [{ text: 'Got it', onPress: loadCampaign }]
    );
  }, [campaign, donationAmount, donationMessage, isAnonymous, pendingPayRef, convertToBase, loadCampaign]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#EC4899" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading campaign details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !campaign) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.expense} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>{error || 'Campaign not found'}</Text>
          <TouchableOpacity
            style={[styles.backActionBtn, { backgroundColor: '#EC4899' }]}
            onPress={() => router.replace('/donate' as any)}
          >
            <Text style={styles.backActionBtnText}>Back to Campaigns</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pct = Math.min(100, Math.round((campaign.amount_raised / campaign.target_amount) * 100));
  const isCompleted = campaign.status === 'completed';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {campaign.title}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.mainWrapper, isDesktop && styles.desktopWrapper]}>
          {/* Cover Photo */}
          {campaign.cover_image ? (
            <View style={[styles.coverWrap, { borderColor: colors.border }]}>
              <Image source={{ uri: campaign.cover_image }} style={styles.coverImg} resizeMode="cover" />
            </View>
          ) : null}

          {/* Main Info Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.categoryPill, { color: '#EC4899', backgroundColor: '#EC4899' + '18' }]}>
                {campaign.category.toUpperCase()}
              </Text>
              <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                Launched {formatDate(campaign.created_at)}
              </Text>
            </View>

            <Text style={[styles.campaignTitle, { color: colors.text }]}>{campaign.title}</Text>

            <View style={styles.organizerRow}>
              <Ionicons name="person-circle" size={18} color="#EC4899" />
              <Text style={[styles.organizerText, { color: colors.textSecondary }]}>
                Organized by <Text style={{ fontWeight: FontWeight.bold, color: colors.text }}>{campaign.organizer_name}</Text>
              </Text>
            </View>

            {/* Financial Progress */}
            <View style={[styles.progressBox, { backgroundColor: colors.surfaceHighlight }]}>
              <View style={styles.raisedHeaderRow}>
                <Text style={[styles.raisedAmount, { color: colors.text }]}>
                  {formatCurrency(campaign.amount_raised)}
                </Text>
                <Text style={[styles.targetAmount, { color: colors.textSecondary }]}>
                  of {formatCurrency(campaign.target_amount)} goal ({pct}%)
                </Text>
              </View>

              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: '#EC4899' }]} />
              </View>

              <View style={styles.progressStatsRow}>
                <Text style={[styles.statItem, { color: colors.textSecondary }]}>
                  ❤️ <Text style={{ fontWeight: FontWeight.bold, color: colors.text }}>{campaign.donor_count || 0}</Text> donors
                </Text>
                {isCompleted ? (
                  <Text style={[styles.statItem, { color: colors.success, fontWeight: FontWeight.bold }]}>
                    ✓ Target Achieved
                  </Text>
                ) : (
                  <Text style={[styles.statItem, { color: colors.textSecondary }]}>
                    {formatCurrency(Math.max(0, campaign.target_amount - campaign.amount_raised))} remaining
                  </Text>
                )}
              </View>
            </View>

            {/* Donate Action Button */}
            {!isCompleted ? (
              <TouchableOpacity
                style={[styles.donateBtn, { backgroundColor: '#EC4899' }]}
                onPress={() => setShowDonateModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="heart" size={18} color="#FFF" />
                <Text style={styles.donateBtnText}>Make a Contribution</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.completedBanner, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={[styles.completedBannerText, { color: colors.success }]}>
                  This campaign reached its fundraising goal! Thank you to all donors.
                </Text>
              </View>
            )}

            {/* Objective & Description */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>CAMPAIGN OBJECTIVE</Text>
            <Text style={[styles.objectiveText, { color: colors.text }]}>{campaign.objective}</Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>ABOUT THIS INITIATIVE</Text>
            <Text style={[styles.bodyText, { color: colors.text }]}>{campaign.description}</Text>
          </View>

          {/* Donors & Community Supporters */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.donorsHeader}>
              <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
                RECENT SUPPORTERS ({campaign.donors?.length || 0})
              </Text>
            </View>

            {campaign.donors && campaign.donors.length > 0 ? (
              <View style={styles.donorsList}>
                {campaign.donors.map((d) => (
                  <View
                    key={d.id}
                    style={[styles.donorRow, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
                  >
                    <Ionicons name="heart-circle" size={24} color="#EC4899" />
                    <View style={{ flex: 1 }}>
                      <View style={styles.donorNameRow}>
                        <Text style={[styles.donorName, { color: colors.text }]}>{d.donor_name}</Text>
                        <Text style={[styles.donorAmount, { color: '#EC4899' }]}>
                          +{formatCurrency(d.amount)}
                        </Text>
                      </View>
                      {d.message ? (
                        <Text style={[styles.donorMsg, { color: colors.textSecondary }]}>"{d.message}"</Text>
                      ) : null}
                      <Text style={[styles.donorDate, { color: colors.textTertiary }]}>
                        {formatDate(d.created_at)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.noDonorsText, { color: colors.textTertiary }]}>
                Be the first supporter to contribute to this campaign!
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: Make a Contribution                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal visible={showDonateModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Contribute to Cause</Text>
              <TouchableOpacity onPress={() => setShowDonateModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Supporting "{campaign.title}". Your contribution directly funds student resources.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Donation Amount ({currency.symbol})
            </Text>
            <View style={[styles.amountInputWrap, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
              <Text style={[styles.currPrefix, { color: colors.textTertiary }]}>{currency.symbol}</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={donationAmount}
                onChangeText={setDonationAmount}
                keyboardType="numeric"
              />
            </View>

            {/* Presets */}
            <View style={styles.presetsRow}>
              {[100, 250, 500, 1000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.presetBtn, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
                  onPress={() => setDonationAmount(amt.toString())}
                >
                  <Text style={[styles.presetText, { color: colors.text }]}>+{currency.symbol}{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 8 }]}>
              Encouraging Note (Optional)
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, color: colors.text }]}
              value={donationMessage}
              onChangeText={setDonationMessage}
              placeholder="e.g. Great initiative for student community!"
              placeholderTextColor={colors.textTertiary}
            />

            {/* Anonymous Toggle */}
            <TouchableOpacity
              style={styles.anonToggle}
              onPress={() => setIsAnonymous(!isAnonymous)}
            >
              <Ionicons
                name={isAnonymous ? 'checkbox' : 'square-outline'}
                size={18}
                color={isAnonymous ? '#EC4899' : colors.textSecondary}
              />
              <Text style={[styles.anonText, { color: colors.text }]}>
                Donate anonymously (display as "Kind Donor")
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowDonateModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#EC4899' }]}
                onPress={handleProceedToQR}
              >
                <Ionicons name="qr-code-outline" size={16} color="#fff" />
                <Text style={styles.modalSubmitText}>Scan to Pay →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Payment Modal */}
      {campaign && (
        <QRPaymentModal
          visible={showQR}
          onClose={() => setShowQR(false)}
          mode="donate"
          targetTitle={campaign.title}
          amountTHB={convertToBase(parseFloat(donationAmount) || 0)}
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
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + 40,
  },
  mainWrapper: {
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  desktopWrapper: {
    maxWidth: 780,
  },
  coverWrap: {
    width: '100%',
    height: 240,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryPill: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dateText: {
    fontSize: 10,
  },
  campaignTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    lineHeight: 26,
    marginBottom: 8,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  organizerText: {
    fontSize: FontSize.xs + 1,
  },
  progressBox: {
    padding: 14,
    borderRadius: BorderRadius.md,
    marginBottom: 14,
  },
  raisedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  raisedAmount: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
  },
  targetAmount: {
    fontSize: FontSize.xs,
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
  progressStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    fontSize: 11,
  },
  donateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    marginBottom: 8,
  },
  donateBtnText: {
    color: '#FFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
  },
  completedBannerText: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  objectiveText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    lineHeight: 20,
  },
  bodyText: {
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  donorsHeader: {
    marginBottom: 10,
  },
  donorsList: {
    gap: 8,
  },
  donorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  donorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  donorName: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  donorAmount: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.extrabold,
  },
  donorMsg: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    marginTop: 2,
  },
  donorDate: {
    fontSize: 9,
    marginTop: 4,
  },
  noDonorsText: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: 12,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },
  errorTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  backActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: 8,
  },
  backActionBtnText: {
    color: '#FFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: 10,
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
  anonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  anonText: {
    fontSize: FontSize.xs,
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

