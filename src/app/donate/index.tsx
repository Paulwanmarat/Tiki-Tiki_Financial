import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useAuth } from '@/context/AuthContext';
import { confirmAction } from '@/utils/confirm';
import { getDonateCampaigns, deleteDonateCampaign } from '@/services/database/donate';
import { DonateCampaign, DEFAULT_DONATE_CAMPAIGNS } from '@/types/donate';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { PIGGY_LOGO } from '@/constants/assets';

const CATEGORIES = [
  'All',
  'Student Welfare',
  'Campus Green Initiative',
  'Emergency Student Aid',
  'Tech Lab Equipment',
  'Community Drives',
];

export default function DonateHomeScreen() {
  const { colors, isDark } = useTheme();
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const isAdmin = Boolean(
    user && (
      user.role === 'admin' ||
      user.role === 'owner' ||
      user.email?.toLowerCase() === 'paulwanmarat@gmail.com' ||
      user.email?.toLowerCase() === 'admin@spr.app' ||
      user.email?.toLowerCase().startsWith('admin@')
    )
  );

  const [campaigns, setCampaigns] = useState<DonateCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDonateCampaigns({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        search: search.trim() || undefined,
      });
      setCampaigns(data && data.length > 0 ? data : DEFAULT_DONATE_CAMPAIGNS);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
      setCampaigns(DEFAULT_DONATE_CAMPAIGNS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, search]);

  useFocusEffect(
    useCallback(() => {
      loadCampaigns();
    }, [loadCampaigns])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCampaigns();
  };

  const handleDeleteCampaign = (e: any, camp: DonateCampaign) => {
    e?.stopPropagation?.();
    confirmAction(
      'Remove Campaign',
      `Are you sure you want to remove "${camp.title}"? Since this campaign has not received any contributions, it will be deleted.`,
      'Remove Campaign',
      async () => {
        try {
          await deleteDonateCampaign(camp.id);
          Alert.alert('Campaign Removed', 'Your campaign has been removed successfully.');
          loadCampaigns();
        } catch (err: any) {
          Alert.alert('Notice', err?.message || 'Failed to remove campaign');
        }
      },
      true
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Header */}
      <View style={[styles.topHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.topHeaderLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View>
            <View style={styles.badgeRow}>
              <View style={[styles.badgeDot, { backgroundColor: '#EC4899' }]} />
              <Text style={[styles.badgeText, { color: '#EC4899' }]}>COMMUNITY FUNDRAISING</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>SPR Donate</Text>
          </View>
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: '#EC4899' }]}
            onPress={() => router.push('/donate/create' as any)}
          >
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={styles.createBtnText}>Create Campaign</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Search & Info Section */}
      <View style={[styles.searchSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchCapsule, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search student initiatives, lab equipment drives..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadCampaigns}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); loadCampaigns(); }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. Category Horizontal Filter */}
      <View style={[styles.categoryBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  { borderColor: isSelected ? '#EC4899' : colors.border },
                  isSelected && { backgroundColor: '#EC4899' + '18' },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: isSelected ? '#EC4899' : colors.textSecondary },
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

      {/* 4. Campaigns Grid */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EC4899" />}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#EC4899" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading causes & campaigns...</Text>
          </View>
        ) : campaigns.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(236, 72, 153, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md }}>
              <Ionicons name="shield-checkmark-outline" size={34} color="#EC4899" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Fundraising Campaigns</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Official campus fundraising campaigns are inaugurated exclusively by Saipanyarangsit School administrators and Student Welfare officers.
            </Text>
            {isAdmin ? (
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: '#EC4899', marginTop: Spacing.md }]}
                onPress={() => router.push('/donate/create' as any)}
              >
                <Ionicons name="add" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionBtnText}>Create Official Campaign</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginTop: Spacing.md, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.surfaceElevated }}>
                <Text style={{ fontSize: 12, color: colors.textTertiary, textAlign: 'center' }}>
                  Institutional Policy: To propose a new student welfare cause, contact your grade advisor or school administration.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.grid, isDesktop && styles.desktopGrid]}>
            {campaigns.map((camp) => {
              const pct = Math.min(100, Math.round((camp.amount_raised / camp.target_amount) * 100));
              const isCompleted = camp.status === 'completed';

              return (
                <TouchableOpacity
                  key={camp.id}
                  style={[
                    styles.campaignCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isDesktop && styles.desktopCard,
                  ]}
                  onPress={() => router.push(`/donate/${camp.id}` as any)}
                  activeOpacity={0.85}
                >
                  {/* Banner Image */}
                  <View style={[styles.coverWrap, { backgroundColor: colors.surfaceHighlight }]}>
                    {camp.cover_image ? (
                      <Image source={{ uri: camp.cover_image }} style={styles.coverImg} resizeMode="cover" />
                    ) : (
                      <Ionicons name="gift-outline" size={36} color={colors.textTertiary} />
                    )}

                    <View style={[styles.categoryBadge, { backgroundColor: '#EC4899' }]}>
                      <Text style={styles.categoryBadgeText}>{camp.category.toUpperCase()}</Text>
                    </View>

                    {isCompleted && (
                      <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
                        <Text style={styles.completedBadgeText}>GOAL COMPLETED</Text>
                      </View>
                    )}
                  </View>

                  {/* Body */}
                  <View style={styles.cardBody}>
                    <Text style={[styles.campTitle, { color: colors.text }]} numberOfLines={2}>
                      {camp.title}
                    </Text>
                    <Text style={[styles.campDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {camp.description}
                    </Text>

                    {/* Progress */}
                    <View style={styles.progressWrap}>
                      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceHighlight }]}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: '#EC4899' }]} />
                      </View>
                      <View style={styles.progressNums}>
                        <Text style={[styles.raisedText, { color: colors.text }]}>
                          Raised: <Text style={{ fontWeight: FontWeight.bold }}>{formatCurrency(camp.amount_raised)}</Text>
                        </Text>
                        <Text style={[styles.goalText, { color: colors.textSecondary }]}>
                          Goal: {formatCurrency(camp.target_amount)} ({pct}%)
                        </Text>
                      </View>
                    </View>

                    {/* Organizer & Donors Footer */}
                    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                      <View style={styles.organizerRow}>
                        <Ionicons name="sparkles" size={12} color="#EC4899" />
                        <Text style={[styles.organizerText, { color: colors.textSecondary }]} numberOfLines={1}>
                          Created by <Text style={{ fontWeight: FontWeight.bold, color: colors.text }}>{camp.organizer_name}</Text>
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={styles.donorsCount}>
                          <Ionicons name="heart" size={13} color="#EC4899" />
                          <Text style={[styles.donorsText, { color: '#EC4899' }]}>
                            {camp.donor_count || 0} donors
                          </Text>
                        </View>

                        {/* Creator/Admin remove action if not used */}
                        {(camp.organizer_id === user?.id || isAdmin) && Number(camp.amount_raised || 0) === 0 && (
                          <TouchableOpacity
                            style={[styles.cardDeleteBtn, { borderColor: colors.expense + '40', backgroundColor: colors.expense + '10' }]}
                            onPress={(e) => handleDeleteCampaign(e, camp)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={12} color={colors.expense} />
                            <Text style={[styles.cardDeleteText, { color: colors.expense }]}>Remove</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
  },
  createBtnText: {
    color: '#FFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  searchCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    height: '100%',
  },
  categoryBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
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
  emptyCard: {
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
  emptyActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: 8,
  },
  emptyActionBtnText: {
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
  campaignCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 4,
  },
  desktopCard: {
    width: '48.5%',
  },
  coverWrap: {
    width: '100%',
    height: 160,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  completedBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  completedBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: Spacing.md,
  },
  campTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    lineHeight: 20,
    marginBottom: 6,
  },
  campDesc: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginBottom: 10,
  },
  progressWrap: {
    marginBottom: 10,
  },
  progressTrack: {
    height: 7,
    borderRadius: 3.5,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3.5,
  },
  progressNums: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  raisedText: {
    fontSize: 11,
  },
  goalText: {
    fontSize: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  organizerText: {
    fontSize: 10,
  },
  donorsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  donorsText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  cardDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  cardDeleteText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
});

