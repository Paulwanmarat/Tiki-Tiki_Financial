import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import {
  getMarketplaceListingById,
  markMarketplaceItemSold,
  deleteMarketplaceListing,
  expressMarketplaceInterest,
  reportMarketplaceListing,
} from '@/services/database/marketplace';
import { MarketplaceDetail } from '@/types/marketplace';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { confirmAction } from '@/utils/confirm';
import { formatDate } from '@/utils/formatters';

export default function MarketplaceDetailScreen() {
  const { colors, isDark } = useTheme();
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [item, setItem] = useState<MarketplaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interestMessage, setInterestMessage] = useState('Hi! Is this item still available for dorm pickup?');
  const [interestContact, setInterestContact] = useState('');
  const [submittingInterest, setSubmittingInterest] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Prohibited item or counterfeit');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const [markingSold, setMarkingSold] = useState(false);

  const loadItem = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getMarketplaceListingById(id);
      setItem(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load item detail');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const handleExpressInterest = async () => {
    if (!id) return;
    try {
      setSubmittingInterest(true);
      await expressMarketplaceInterest(id, interestMessage.trim(), interestContact.trim());
      setShowInterestModal(false);
      Alert.alert('Inquiry Sent!', 'The seller has received your contact interest.');
      await loadItem();
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Failed to send inquiry');
    } finally {
      setSubmittingInterest(false);
    }
  };

  const handleReport = async () => {
    if (!id) return;
    try {
      setSubmittingReport(true);
      await reportMarketplaceListing(id, reportReason, reportDetails.trim());
      setShowReportModal(false);
      Alert.alert('Report Received', 'Thank you. Our student moderation team will inspect this item.');
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleMarkSoldPrompt = () => {
    if (!item) return;
    confirmAction(
      'Mark as Sold',
      `Mark "${item.title}" as sold? This will notify interested buyers that the item has been claimed.\n\nWould you also like to record ${formatCurrency(item.price)} into your SPR Income ledger?`,
      'Mark Sold + Add Income',
      async () => {
        try {
          setMarkingSold(true);
          await markMarketplaceItemSold(item.id, true);
          Alert.alert('Item Sold', 'Listing marked as sold and income recorded to your financial ledger!');
          await loadItem();
        } catch (err: any) {
          Alert.alert('Error', err?.message || 'Failed to mark sold');
        } finally {
          setMarkingSold(false);
        }
      },
      false
    );
  };

  const handleDeleteListingPrompt = () => {
    if (!item) return;
    confirmAction(
      'Remove Listing',
      `Are you sure you want to remove "${item.title}" from the marketplace?`,
      'Remove',
      async () => {
        try {
          await deleteMarketplaceListing(item.id);
          router.replace('/marketplace' as any);
        } catch (err: any) {
          Alert.alert('Error', err?.message || 'Failed to remove listing');
        }
      },
      true
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading listing details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !item) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.expense} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>{error || 'Item not found'}</Text>
          <TouchableOpacity
            style={[styles.backToMarketBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/marketplace' as any)}
          >
            <Text style={styles.backToMarketText}>Back to Marketplace</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isSold = item.status === 'sold';
  const coverImg = item.images && item.images.length > 0 ? item.images[0] : null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        {!item.isOwner && (
          <TouchableOpacity onPress={() => setShowReportModal(true)} style={styles.reportBtn}>
            <Ionicons name="flag-outline" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.mainWrapper, isDesktop && styles.desktopWrapper]}>
          {/* Cover Photo */}
          <View style={[styles.photoFrame, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
            {coverImg ? (
              <Image source={{ uri: coverImg }} style={styles.photoImg} resizeMode="contain" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="image-outline" size={64} color={colors.textTertiary} />
                <Text style={[styles.noPhotoText, { color: colors.textTertiary }]}>No photos uploaded</Text>
              </View>
            )}

            {/* Status Overlays */}
            <View style={styles.photoBadgeRow}>
              {isSold ? (
                <View style={[styles.statusBadge, { backgroundColor: colors.textSecondary }]}>
                  <Text style={styles.statusBadgeText}>SOLD</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
                  <Text style={styles.statusBadgeText}>AVAILABLE FOR HANDOVER</Text>
                </View>
              )}
            </View>
          </View>

          {/* Pricing & Key Info */}
          <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.categoryRow}>
              <Text style={[styles.categoryPill, { color: colors.primary, backgroundColor: colors.primary + '18' }]}>
                {item.category.toUpperCase()}
              </Text>
              <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                Posted {formatDate(item.created_at)}
              </Text>
            </View>

            <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.priceTag, { color: colors.text }]}>{formatCurrency(item.price)}</Text>

            {/* Condition pill & tags */}
            <View style={styles.conditionRow}>
              <Text style={[styles.condLabel, { color: colors.textSecondary }]}>Condition:</Text>
              <View style={[styles.condBadge, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                <Text style={[styles.condBadgeText, { color: colors.text }]}>
                  {item.condition.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Description */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>DESCRIPTION</Text>
            <Text style={[styles.descText, { color: colors.text }]}>
              {item.description || 'No additional description provided by the seller.'}
            </Text>

            {/* Handover notes */}
            {item.contact_info ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>CAMPUS HANDOVER / PICKUP</Text>
                <View style={[styles.handoverBox, { backgroundColor: colors.surfaceHighlight }]}>
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                  <Text style={[styles.handoverText, { color: colors.text }]}>{item.contact_info}</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Seller Profile Card */}
          <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>SELLER INFORMATION</Text>
            <View style={styles.sellerProfileRow}>
              <View style={[styles.sellerAvatar, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sellerName, { color: colors.text }]}>
                  {item.seller_name || 'Verified University Student'}
                </Text>
                <Text style={[styles.sellerVerified, { color: colors.success }]}>
                  ✓ Verified Campus Account
                </Text>
              </View>
            </View>
          </View>

          {/* ───────────────────────────────────────────────────────── */}
          {/* SELLER MANAGEMENT CONTROLS (If owner)                     */}
          {/* ───────────────────────────────────────────────────────── */}
          {item.isOwner ? (
            <View style={[styles.ownerSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionHeading, { color: colors.primary }]}>SELLER CONTROLS</Text>
              <Text style={[styles.ownerDesc, { color: colors.textSecondary }]}>
                You are the creator of this listing.
              </Text>

              {!isSold ? (
                <TouchableOpacity
                  style={[styles.soldActionBtn, { backgroundColor: colors.success }]}
                  onPress={handleMarkSoldPrompt}
                  disabled={markingSold}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.soldActionText}>Mark as Sold & Record Income</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.alreadySoldBanner, { backgroundColor: colors.success + '15' }]}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={[styles.alreadySoldText, { color: colors.success }]}>
                    This item was confirmed sold and archived.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.deleteBtn, { borderColor: colors.expense + '40' }]}
                onPress={handleDeleteListingPrompt}
              >
                <Ionicons name="trash-outline" size={16} color={colors.expense} />
                <Text style={[styles.deleteBtnText, { color: colors.expense }]}>Remove Listing</Text>
              </TouchableOpacity>

              {/* Interested Buyers List for Seller */}
              {item.buyerInterests && item.buyerInterests.length > 0 && (
                <View style={styles.buyersBox}>
                  <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
                    INTERESTED BUYERS ({item.buyerInterests.length})
                  </Text>
                  {item.buyerInterests.map((buyer) => (
                    <View
                      key={buyer.id}
                      style={[styles.buyerRow, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.buyerName, { color: colors.text }]}>
                          {buyer.buyer_name || 'Interested Student'}
                        </Text>
                        <Text style={[styles.buyerMsg, { color: colors.textSecondary }]}>"{buyer.message}"</Text>
                        {buyer.contact ? (
                          <Text style={[styles.buyerContact, { color: colors.primary }]}>
                            Contact: {buyer.contact}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            /* ───────────────────────────────────────────────────────── */
            /* BUYER ACTION SECTION (If visitor / other student)        */
            /* ───────────────────────────────────────────────────────── */
            <View style={styles.buyerActionsArea}>
              {isSold ? (
                <View style={[styles.soldBanner, { backgroundColor: colors.surfaceHighlight }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.soldBannerText, { color: colors.textSecondary }]}>
                    This item has already been marked as sold.
                  </Text>
                </View>
              ) : item.hasExpressedInterest ? (
                <View style={[styles.interestSentCard, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.interestSentTitle, { color: colors.success }]}>Inquiry Sent</Text>
                    <Text style={[styles.interestSentSub, { color: colors.textSecondary }]}>
                      The seller received your message and will arrange dorm handover.
                    </Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.inquireBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowInterestModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chatbubbles" size={20} color="#FFF" />
                  <Text style={styles.inquireBtnText}>Contact Seller / Express Interest</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: Express Interest / Buyer Message                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal visible={showInterestModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Contact Seller</Text>
              <TouchableOpacity onPress={() => setShowInterestModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Send a message to arrange safe campus inspection and pickup for "{item.title}".
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Message</Text>
            <TextInput
              style={[styles.modalTextArea, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, color: colors.text }]}
              value={interestMessage}
              onChangeText={setInterestMessage}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Your Contact Note (LINE, Phone or Dorm)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. LINE ID: @student_bob or Dorm 3 lobby"
              placeholderTextColor={colors.textTertiary}
              value={interestContact}
              onChangeText={setInterestContact}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowInterestModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                onPress={handleExpressInterest}
                disabled={submittingInterest}
              >
                {submittingInterest ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Send Inquiry</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: Report Listing                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal visible={showReportModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.expense }]}>Report Listing</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Help keep SPR safe. Tell us why this item should be moderated.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reason</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, color: colors.text }]}
              value={reportReason}
              onChangeText={setReportReason}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Details</Text>
            <TextInput
              style={[styles.modalTextArea, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe the issue..."
              placeholderTextColor={colors.textTertiary}
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.expense }]}
                onPress={handleReport}
                disabled={submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  reportBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + 40,
  },
  mainWrapper: {
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  desktopWrapper: {
    maxWidth: 820,
  },
  photoFrame: {
    width: '100%',
    height: 280,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noPhotoText: {
    fontSize: FontSize.xs,
  },
  photoBadgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  cardSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryPill: {
    fontSize: 10,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dateText: {
    fontSize: FontSize.xs,
  },
  itemTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    marginBottom: 6,
    lineHeight: 26,
  },
  priceTag: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    marginBottom: 12,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  condLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  condBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  condBadgeText: {
    fontSize: 10,
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
    marginBottom: 8,
  },
  descText: {
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  handoverBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: BorderRadius.md,
  },
  handoverText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  sellerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerName: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
  },
  sellerVerified: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  ownerSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 12,
  },
  ownerDesc: {
    fontSize: FontSize.xs,
    marginTop: -4,
  },
  soldActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  soldActionText: {
    color: '#FFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  alreadySoldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: BorderRadius.md,
  },
  alreadySoldText: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  buyersBox: {
    marginTop: 8,
    gap: 8,
  },
  buyerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  buyerName: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  buyerMsg: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    marginTop: 2,
  },
  buyerContact: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginTop: 4,
  },
  buyerActionsArea: {
    marginTop: 4,
  },
  inquireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  inquireBtnText: {
    color: '#FFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  soldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: BorderRadius.lg,
  },
  soldBannerText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  interestSentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  interestSentTitle: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
  },
  interestSentSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
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
  backToMarketBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: 8,
  },
  backToMarketText: {
    color: '#FFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
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
  modalInput: {
    height: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: FontSize.sm,
  },
  modalTextArea: {
    minHeight: 80,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 10,
    fontSize: FontSize.sm,
    textAlignVertical: 'top',
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
    minWidth: 80,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#FFF',
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
});

