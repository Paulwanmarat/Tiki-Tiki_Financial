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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { TrylandWordmark } from '@/components/ui/TrylandWordmark';
import { QRPaymentModal } from '@/components/ui/QRPaymentModal';
import { getTreeInitiatives, donatePlantTrees, TreeInitiative, TreeStats } from '@/services/database/tryland';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';

const TREE_TIERS = [
  { trees: 1, amount: 50, label: '🌱 1 Tree', sub: 'Sapling Starter' },
  { trees: 5, amount: 250, label: '🌿 5 Trees', sub: 'School Garden Patch' },
  { trees: 10, amount: 500, label: '🌳 10 Trees', sub: 'Green Corridor Grove' },
  { trees: 20, amount: 1000, label: '🌲 20 Trees', sub: 'Forest Patron' },
];

export default function TrylandTreePlantingScreen() {
  const { colors, isDark } = useTheme();
  const { formatCurrency, convertToBase } = useCurrency();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [initiatives, setInitiatives] = useState<TreeInitiative[]>([]);
  const [stats, setStats] = useState<TreeStats>({
    total_trees_planted: 0,
    total_money_raised: 0,
    total_contributors: 0,
    co2_offset_kg: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tree Donation Modal state
  const [selectedInitiative, setSelectedInitiative] = useState<TreeInitiative | null>(null);
  const [treeCount, setTreeCount] = useState<number>(5);
  const [customAmount, setCustomAmount] = useState<string>('250');
  const [donorMessage, setDonorMessage] = useState<string>('For a greener future and campus shade!');
  const [showQR, setShowQR] = useState(false);
  const [pendingPayRef, setPendingPayRef] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTreeInitiatives();
      if (res) {
        setInitiatives(res.initiatives || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load Tryland tree initiatives:', err);
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

  const handleOpenDonate = (init: TreeInitiative) => {
    setSelectedInitiative(init);
    setTreeCount(5);
    setCustomAmount((5 * init.cost_per_tree).toString());
    setDonorMessage('Planting trees for our campus and planet!');
  };

  const handleSelectTier = (t: typeof TREE_TIERS[0]) => {
    setTreeCount(t.trees);
    if (selectedInitiative) {
      setCustomAmount((t.trees * selectedInitiative.cost_per_tree).toString());
    } else {
      setCustomAmount(t.amount.toString());
    }
  };

  const handleProceedToQR = () => {
    if (!selectedInitiative) return;
    const numAmt = parseFloat(customAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      Alert.alert('Invalid Amount', 'Please select or enter a valid donation amount.');
      return;
    }
    const ref = `TRY-TREE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setPendingPayRef(ref);
    setShowQR(true);
  };

  const handleQRConfirm = async (confirmData: {
    slip_reference: string;
    transfer_time: string;
    note?: string;
    guest_name?: string;
    guest_email?: string;
    slip_url?: string;
  }) => {
    if (!selectedInitiative) return;
    const numAmt = parseFloat(customAmount);
    const baseAmt = convertToBase(numAmt);

    await donatePlantTrees(selectedInitiative.id, {
      tree_count: treeCount,
      amount: baseAmt,
      message: confirmData.note || donorMessage,
      slip_reference: confirmData.slip_reference,
      slip_url: confirmData.slip_url,
      transfer_time: confirmData.transfer_time,
      payment_reference: pendingPayRef,
      guest_name: confirmData.guest_name,
      guest_email: confirmData.guest_email,
    });

    loadData();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.topHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.topHeaderLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TrylandWordmark size="md" showSubtitle />
        </View>

        <View style={styles.topHeaderRight}>
          <TouchableOpacity
            style={[styles.rkShortcutBtn, { backgroundColor: '#10B98118', borderColor: '#10B981' }]}
            onPress={() => router.push('/rk' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="happy-outline" size={16} color="#10B981" />
            <Text style={styles.rkShortcutText}>RK Bills</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      >
        {/* Save The Planet Hero Banner */}
        <View style={[styles.heroCard, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5', borderColor: '#059669' }]}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroPill}>
              <Text style={{ fontSize: 13 }}>🌳</Text>
              <Text style={styles.heroPillText}>SAVE THE PLANET INITIATIVE</Text>
            </View>
            <Text style={[styles.heroSubDate, { color: isDark ? '#A7F3D0' : '#047857' }]}>SPR Green Earth</Text>
          </View>

          <Text style={[styles.heroHeading, { color: isDark ? '#FFFFFF' : '#064E3B' }]}>
            Donate to Plant More Trees
          </Text>
          <Text style={[styles.heroBody, { color: isDark ? '#D1FAE5' : '#065F46' }]}>
            Transform spare allowances into verified living trees. Just ฿50 plants 1 native tree on campus or along coastal mangrove zones with tracked student stewardship.
          </Text>

          {/* Impact Tally Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: isDark ? '#04785740' : '#FFFFFF', borderColor: '#05966930' }]}>
              <Text style={[styles.statValue, { color: '#059669' }]}>{stats.total_trees_planted.toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: isDark ? '#A7F3D0' : '#065F46' }]}>Trees Funded</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: isDark ? '#04785740' : '#FFFFFF', borderColor: '#05966930' }]}>
              <Text style={[styles.statValue, { color: '#059669' }]}>฿{stats.total_money_raised.toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: isDark ? '#A7F3D0' : '#065F46' }]}>Raised in ฿</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: isDark ? '#04785740' : '#FFFFFF', borderColor: '#05966930' }]}>
              <Text style={[styles.statValue, { color: '#059669' }]}>{stats.co2_offset_kg.toLocaleString()} kg</Text>
              <Text style={[styles.statLabel, { color: isDark ? '#A7F3D0' : '#065F46' }]}>Est. CO2 Offset</Text>
            </View>
          </View>
        </View>

        {/* Section Heading */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Tree Planting Initiatives</Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              Choose a project to plant trees on campus walkways or coastal mangrove reserves
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading tree initiatives...</Text>
          </View>
        ) : initiatives.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44 }}>🌳</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No initiatives currently open</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Check back soon for the next campus planting drive.</Text>
          </View>
        ) : (
          <View style={[styles.grid, isDesktop && styles.desktopGrid]}>
            {initiatives.map((init) => {
              const pct = Math.min(100, Math.round((init.trees_planted / init.target_trees) * 100));
              const remaining = Math.max(0, init.target_trees - init.trees_planted);

              return (
                <View
                  key={init.id}
                  style={[
                    styles.initCard,
                    isDesktop && styles.desktopCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.initTop}>
                    <View style={styles.initBadge}>
                      <Ionicons name="location-outline" size={13} color="#059669" />
                      <Text style={styles.initLocation}>{init.location}</Text>
                    </View>
                    <View style={styles.costBadge}>
                      <Text style={styles.costText}>฿{init.cost_per_tree} / Tree</Text>
                    </View>
                  </View>

                  <Text style={[styles.initTitle, { color: colors.text }]}>{init.title}</Text>
                  <Text style={[styles.initDesc, { color: colors.textSecondary }]}>{init.description}</Text>

                  {/* Progress bar */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressRow}>
                      <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>Progress</Text>
                      <Text style={[styles.progressText, { color: '#059669' }]}>
                        {init.trees_planted} / {init.target_trees} Trees ({pct}%)
                      </Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceHighlight }]}>
                      <View style={[styles.progressFill, { width: `${Math.max(4, pct)}%`, backgroundColor: '#059669' }]} />
                    </View>
                    <Text style={[styles.remainingText, { color: colors.textTertiary }]}>
                      {remaining > 0 ? `${remaining} trees still needed` : 'Goal Reached! Thank you!'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.plantBtn, { backgroundColor: '#059669' }]}
                    onPress={() => handleOpenDonate(init)}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontSize: 16 }}>🌳</Text>
                    <Text style={styles.plantBtnText}>Plant Trees</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Cross Promotion: Rich Kid (RK) feature */}
        <View style={[styles.crossCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={[styles.crossIconBg, { backgroundColor: '#10B98118' }]}>
              <Ionicons name="happy" size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.crossTitle, { color: colors.text }]}>RK (Rich Kid) Bill Sponsorship</Text>
              <Text style={[styles.crossSub, { color: colors.textSecondary }]}>
                Have student bills to sponsor or educational expenses to upload? Visit Rich Kid!
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.crossBtn, { backgroundColor: '#10B981' }]}
            onPress={() => router.push('/rk' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.crossBtnText}>Go to Rich Kid →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Step 1: Tree Quantity Selection Modal */}
      {selectedInitiative && !showQR && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 20 }}>🌳</Text>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Plant Trees · TRYLAND</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedInitiative(null)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Sponsoring trees for <Text style={{ fontWeight: FontWeight.bold, color: colors.text }}>{selectedInitiative.title}</Text> at ฿{selectedInitiative.cost_per_tree} per tree.
            </Text>

            {/* Tree Tier Presets */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Select How Many Trees to Plant</Text>
            <View style={styles.tierGrid}>
              {TREE_TIERS.map((t) => {
                const isSelected = treeCount === t.trees;
                return (
                  <TouchableOpacity
                    key={t.trees}
                    style={[
                      styles.tierCard,
                      {
                        backgroundColor: isSelected ? '#05966914' : colors.surfaceHighlight,
                        borderColor: isSelected ? '#059669' : colors.border,
                      },
                    ]}
                    onPress={() => handleSelectTier(t)}
                  >
                    <Text style={[styles.tierLabel, { color: isSelected ? '#059669' : colors.text }]}>{t.label}</Text>
                    <Text style={[styles.tierPrice, { color: '#059669' }]}>฿{t.trees * selectedInitiative.cost_per_tree}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Total Amount Input */}
            <View style={styles.amountWrap}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Total Contribution (฿ THB)</Text>
              <View style={[styles.amountInputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.currPrefix, { color: '#059669' }]}>฿</Text>
                <TextInput
                  value={customAmount}
                  onChangeText={(val) => {
                    setCustomAmount(val);
                    const n = parseFloat(val);
                    if (!isNaN(n) && selectedInitiative.cost_per_tree > 0) {
                      setTreeCount(Math.max(1, Math.round(n / selectedInitiative.cost_per_tree)));
                    }
                  }}
                  keyboardType="numeric"
                  style={[styles.amountInput, { color: colors.text }]}
                />
              </View>
            </View>

            {/* Message / Dedication */}
            <View style={styles.amountWrap}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Tree Dedication / Note (Optional)</Text>
              <TextInput
                value={donorMessage}
                onChangeText={setDonorMessage}
                placeholder="e.g. In honor of Class 2026 green campus drive"
                placeholderTextColor={colors.textTertiary}
                style={[styles.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setSelectedInitiative(null)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#059669' }]}
                onPress={handleProceedToQR}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSubmitText}>Proceed to QR (฿{customAmount}) →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Step 2: PromptPay QR Modal with Slip Auto-OCR */}
      {selectedInitiative && (
        <QRPaymentModal
          visible={showQR}
          onClose={() => {
            setShowQR(false);
            setSelectedInitiative(null);
            loadData();
          }}
          mode="tryland"
          targetTitle={`🌳 ${treeCount} Trees · ${selectedInitiative.title}`}
          amountTHB={parseFloat(customAmount) || 50}
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
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rkShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  rkShortcutText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#10B981',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + 20,
  },
  heroCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#05966922',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  heroPillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#059669',
  },
  heroSubDate: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  heroHeading: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    marginTop: 6,
    marginBottom: 4,
  },
  heroBody: {
    fontSize: FontSize.xs + 1,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  sectionHeaderRow: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
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
    gap: 8,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  emptySub: {
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
  grid: {
    gap: Spacing.md,
  },
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  initCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  desktopCard: {
    width: '48.5%',
  },
  initTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  initBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  initLocation: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#059669',
  },
  costBadge: {
    backgroundColor: '#05966914',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  costText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#059669',
  },
  initTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
  },
  initDesc: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: FontSize.xs,
  },
  progressText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 10,
    marginTop: 4,
  },
  plantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  plantBtnText: {
    color: '#FFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  crossCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: 12,
  },
  crossIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  crossSub: {
    fontSize: FontSize.xs,
    lineHeight: 16,
    marginTop: 2,
  },
  crossBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  crossBtnText: {
    color: '#FFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: 12,
    ...Shadow.lg,
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
  modalSub: {
    fontSize: FontSize.xs,
    lineHeight: 17,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  tierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tierCard: {
    flex: 1,
    minWidth: '45%',
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  tierLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  tierPrice: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
    marginTop: 2,
  },
  amountWrap: {
    gap: 4,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    height: 42,
    gap: 6,
  },
  currPrefix: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  amountInput: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    height: 38,
    fontSize: FontSize.xs + 1,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
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
  },
  modalSubmitText: {
    color: '#FFF',
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
});
