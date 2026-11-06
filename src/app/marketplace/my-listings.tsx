import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import {
  getMyMarketplaceListings,
  markMarketplaceItemSold,
  deleteMarketplaceListing,
} from '@/services/database/marketplace';
import { MarketplaceListing } from '@/types/marketplace';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { confirmAction } from '@/utils/confirm';

export default function MyListingsScreen() {
  const { colors, isDark } = useTheme();
  const { formatCurrency } = useCurrency();
  const router = useRouter();

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'sold'>('all');

  const loadMyListings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyMarketplaceListings();
      setListings(data);
    } catch (err) {
      console.error('Failed to load my listings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMyListings();
  }, [loadMyListings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMyListings();
  };

  const handleMarkSold = (item: MarketplaceListing) => {
    confirmAction(
      'Mark as Sold',
      `Mark "${item.title}" as sold and record ${formatCurrency(item.price)} to your SPR Income ledger?`,
      'Mark Sold + Add Income',
      async () => {
        try {
          await markMarketplaceItemSold(item.id, true);
          Alert.alert('Success', 'Listing marked as sold!');
          loadMyListings();
        } catch (err: any) {
          Alert.alert('Error', err?.message || 'Failed to mark sold');
        }
      }
    );
  };

  const handleDelete = (item: MarketplaceListing) => {
    confirmAction(
      'Remove Listing',
      `Delete "${item.title}" from the marketplace?`,
      'Remove',
      async () => {
        try {
          await deleteMarketplaceListing(item.id);
          loadMyListings();
        } catch (err: any) {
          Alert.alert('Error', err?.message || 'Failed to remove');
        }
      },
      true
    );
  };

  const filtered = listings.filter((l) => {
    if (filter === 'all') return l.status !== 'removed';
    return l.status === filter;
  });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Marketplace Listings</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/marketplace/create' as any)}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {(['all', 'available', 'sold'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabBtn,
              filter === tab && [styles.tabBtnActive, { borderBottomColor: colors.primary }],
            ]}
            onPress={() => setFilter(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: filter === tab ? colors.primary : colors.textSecondary },
                filter === tab && { fontWeight: FontWeight.bold },
              ]}
            >
              {tab.toUpperCase()} ({listings.filter((l) => (tab === 'all' ? l.status !== 'removed' : l.status === tab)).length})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your items...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="pricetags-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No listings in this tab</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Post pre-loved textbooks, furniture or gadgets to earn student cash!
            </Text>
            <TouchableOpacity
              style={[styles.postBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/marketplace/create' as any)}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.postBtnText}>Post First Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((item) => {
            const isSold = item.status === 'sold';
            const coverImg = item.images && item.images.length > 0 ? item.images[0] : null;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push(`/marketplace/${item.id}` as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.thumbWrap, { backgroundColor: colors.surfaceHighlight }]}>
                  {coverImg ? (
                    <Image source={{ uri: coverImg }} style={styles.thumbImg} resizeMode="cover" />
                  ) : (
                    <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
                  )}
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.itemHeaderRow}>
                    <Text
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isSold ? colors.textSecondary + '20' : colors.success + '20',
                          color: isSold ? colors.textSecondary : colors.success,
                        },
                      ]}
                    >
                      {item.status.toUpperCase()}
                    </Text>
                    <Text style={[styles.categoryBadge, { color: colors.textTertiary }]}>{item.category}</Text>
                  </View>

                  <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.itemPrice, { color: colors.text }]}>{formatCurrency(item.price)}</Text>

                  {/* Actions Row */}
                  <View style={styles.actionsRow}>
                    {!isSold && (
                      <TouchableOpacity
                        style={[styles.smallActionBtn, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}
                        onPress={() => handleMarkSold(item)}
                      >
                        <Ionicons name="checkmark" size={13} color={colors.success} />
                        <Text style={[styles.smallActionText, { color: colors.success }]}>Mark Sold</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.smallActionBtn, { borderColor: colors.expense + '40' }]}
                      onPress={() => handleDelete(item)}
                    >
                      <Ionicons name="trash-outline" size={13} color={colors.expense} />
                      <Text style={[styles.smallActionText, { color: colors.expense }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
    gap: 10,
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
    lineHeight: 18,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: 8,
  },
  postBtnText: {
    color: '#FFF',
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 12,
  },
  thumbWrap: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusPill: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadge: {
    fontSize: 10,
  },
  itemTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  itemPrice: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.extrabold,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  smallActionText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
});

