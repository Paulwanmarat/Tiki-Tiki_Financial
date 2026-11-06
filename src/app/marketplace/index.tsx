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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { getMarketplaceListings } from '@/services/database/marketplace';
import { MarketplaceListing, MarketplaceCategory } from '@/types/marketplace';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { PIGGY_LOGO } from '@/constants/assets';

const CATEGORIES: ('All' | MarketplaceCategory)[] = [
  'All',
  'Textbooks',
  'Electronics',
  'Dorm & Living',
  'Clothing',
  'School Supplies',
  'Hobbies & Sports',
  'Other',
];

export default function MarketplaceScreen() {
  const { colors, isDark } = useTheme();
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | MarketplaceCategory>('All');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMarketplaceListings({
        search: search.trim() || undefined,
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        condition: selectedCondition === 'all' ? undefined : selectedCondition,
        sort: sortBy,
      });
      setListings(data);
    } catch (err) {
      console.error('Failed to load marketplace listings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedCategory, selectedCondition, sortBy]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const conditionLabels: Record<string, string> = {
    new: 'Brand New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Well Used',
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Header Bar */}
      <View style={[styles.topHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.topHeaderLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View>
            <View style={styles.badgeRow}>
              <View style={[styles.badgeDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>STUDENT PRE-LOVED HUB</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>SPR Marketplace</Text>
          </View>
        </View>

        <View style={styles.topHeaderRight}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => router.push('/marketplace/my-listings' as any)}
          >
            <Ionicons name="pricetags-outline" size={16} color={colors.text} />
            <Text style={[styles.headerActionText, { color: colors.text }]}>My Items</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sellBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/marketplace/create' as any)}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.sellBtnText}>+ Sell Item</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Search & Sort Bar */}
      <View style={[styles.searchSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchCapsule, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search textbooks, calculators, dorm furniture..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadListings}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); loadListings(); }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort Chips */}
        <View style={styles.sortRow}>
          <Text style={[styles.filterLabel, { color: colors.textTertiary }]}>SORT:</Text>
          <TouchableOpacity
            style={[styles.sortChip, sortBy === 'newest' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
            onPress={() => setSortBy('newest')}
          >
            <Text style={[styles.sortChipText, { color: sortBy === 'newest' ? colors.primary : colors.textSecondary }]}>Newest</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortChip, sortBy === 'price_asc' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
            onPress={() => setSortBy('price_asc')}
          >
            <Text style={[styles.sortChipText, { color: sortBy === 'price_asc' ? colors.primary : colors.textSecondary }]}>Price: Low to High</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortChip, sortBy === 'price_desc' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
            onPress={() => setSortBy('price_desc')}
          >
            <Text style={[styles.sortChipText, { color: sortBy === 'price_desc' ? colors.primary : colors.textSecondary }]}>Price: High to Low</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Category Horizontal Filter Carousel */}
      <View style={[styles.categoryBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  { borderColor: isSelected ? colors.primary : colors.border },
                  isSelected && { backgroundColor: colors.primary + '18' },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: isSelected ? colors.primary : colors.textSecondary },
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

      {/* 4. Listings Grid */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Finding campus listings...</Text>
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={[styles.piggyCircle, { borderColor: colors.primary + '30' }]}>
              <Image source={PIGGY_LOGO} style={styles.piggyImg} resizeMode="cover" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No items found</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {search || selectedCategory !== 'All'
                ? 'Try adjusting your search filters or check back later.'
                : 'Be the first student to list a textbook or dorm item for sale!'}
            </Text>
            <TouchableOpacity
              style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/marketplace/create' as any)}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.emptyActionBtnText}>Post a Pre-Loved Listing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.grid, isDesktop && styles.desktopGrid]}>
            {listings.map((item) => {
              const isSold = item.status === 'sold';
              const coverImg = item.images && item.images.length > 0 ? item.images[0] : null;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isDesktop && styles.desktopItemCard,
                  ]}
                  onPress={() => router.push(`/marketplace/${item.id}` as any)}
                  activeOpacity={0.85}
                >
                  {/* Photo Thumbnail */}
                  <View style={[styles.thumbWrap, { backgroundColor: colors.surfaceHighlight }]}>
                    {coverImg ? (
                      <Image source={{ uri: coverImg }} style={styles.thumbImg} resizeMode="cover" />
                    ) : (
                      <View style={styles.noImgWrap}>
                        <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
                      </View>
                    )}

                    {/* Status Pill on Photo */}
                    {isSold ? (
                      <View style={[styles.photoPill, { backgroundColor: colors.textSecondary }]}>
                        <Text style={styles.photoPillText}>SOLD</Text>
                      </View>
                    ) : (
                      <View style={[styles.photoPill, { backgroundColor: colors.success }]}>
                        <Text style={styles.photoPillText}>AVAILABLE</Text>
                      </View>
                    )}

                    {/* Condition Pill */}
                    <View style={[styles.condPill, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                      <Text style={styles.condPillText}>{conditionLabels[item.condition] || item.condition}</Text>
                    </View>
                  </View>

                  {/* Card Body */}
                  <View style={styles.cardBody}>
                    <Text style={[styles.itemCategory, { color: colors.primary }]}>{item.category.toUpperCase()}</Text>
                    <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <Text style={[styles.itemPrice, { color: colors.text }]}>
                      {formatCurrency(item.price)}
                    </Text>

                    {/* Seller row */}
                    <View style={[styles.sellerRow, { borderTopColor: colors.border }]}>
                      <Ionicons name="person-circle-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.sellerName, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.seller_name || 'Verified Student'}
                      </Text>
                      {item.buyer_interest_count > 0 && (
                        <View style={[styles.interestBadge, { backgroundColor: colors.primary + '15' }]}>
                          <Ionicons name="chatbubble" size={10} color={colors.primary} />
                          <Text style={[styles.interestText, { color: colors.primary }]}>
                            {item.buyer_interest_count}
                          </Text>
                        </View>
                      )}
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
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  headerActionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  sellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  sellBtnText: {
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
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  sortChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortChipText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
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
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    marginTop: 40,
  },
  piggyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  piggyImg: {
    width: '100%',
    height: '100%',
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  emptyActionBtnText: {
    color: '#FFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  desktopGrid: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  itemCard: {
    width: '48%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    flexGrow: 1,
    maxWidth: 540,
  },
  desktopItemCard: {
    width: '31%',
    maxWidth: 340,
  },
  thumbWrap: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  noImgWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoPillText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  condPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  condPillText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  cardBody: {
    padding: Spacing.sm + 2,
  },
  itemCategory: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    lineHeight: 18,
    height: 36,
  },
  itemPrice: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
    marginTop: 4,
    marginBottom: 8,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sellerName: {
    fontSize: 10,
    flex: 1,
  },
  interestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  interestText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
});

