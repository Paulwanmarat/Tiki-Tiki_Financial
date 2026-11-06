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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import {
  getProjects,
  getSubscriptionStatus,
  activatePilotSubscription,
} from '@/services/database/projects';
import { Project, ProjectDifficulty, SubscriptionStatus } from '@/types/projects';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

const CATEGORIES = [
  'All',
  'Tech & Coding',
  'Robotics & Hardware',
  'Business & Startup',
  'Science & Green Tech',
  'Programming & AI',
];

const DIFFICULTIES: ('All' | ProjectDifficulty)[] = ['All', 'Beginner', 'Intermediate', 'Advanced'];

export default function ProjectsScreen() {
  const { colors, isDark } = useTheme();
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [projects, setProjects] = useState<Project[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | ProjectDifficulty>('All');
  const [activatingPass, setActivatingPass] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [projData, subData] = await Promise.all([
        getProjects({
          category: selectedCategory === 'All' ? undefined : selectedCategory,
          difficulty: selectedDifficulty === 'All' ? undefined : selectedDifficulty,
          search: search.trim() || undefined,
        }),
        getSubscriptionStatus().catch(() => null),
      ]);
      setProjects(projData);
      setSubscription(subData);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedDifficulty, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleActivatePilot = async () => {
    try {
      setActivatingPass(true);
      const result = await activatePilotSubscription();
      Alert.alert('Pilot Pass Active! 🎓', result.message || 'You now have full access to all advanced project tracks.');
      await loadData();
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Failed to activate pass');
    } finally {
      setActivatingPass(false);
    }
  };

  const difficultyColors: Record<ProjectDifficulty, string> = {
    Beginner: colors.success,
    Intermediate: colors.primary,
    Advanced: '#EC4899',
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
              <View style={[styles.badgeDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={[styles.badgeText, { color: '#8B5CF6' }]}>STUDENT INNOVATION LAB</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>SPR Projects</Text>
          </View>
        </View>

        {subscription?.isPremium ? (
          <View style={[styles.passPill, { backgroundColor: '#8B5CF6' + '20', borderColor: '#8B5CF6' }]}>
            <Ionicons name="sparkles" size={13} color="#8B5CF6" />
            <Text style={[styles.passPillText, { color: '#8B5CF6' }]}>PILOT PASS ACTIVE</Text>
          </View>
        ) : null}
      </View>

      {/* 2. Free vs Premium Pilot Pass Banner (if on Free tier) */}
      {!subscription?.isPremium && (
        <View style={[styles.passBanner, { backgroundColor: colors.surface, borderColor: '#8B5CF6' + '50' }]}>
          <View style={[styles.passIconWrap, { backgroundColor: '#8B5CF6' + '20' }]}>
            <Ionicons name="school" size={20} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.passTitle, { color: colors.text }]}>University Student Pilot Pass</Text>
            <Text style={[styles.passSub, { color: colors.textSecondary }]}>
              All students receive complimentary access to advanced project schematics & AI mentorship during the term.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.activateBtn, { backgroundColor: '#8B5CF6' }]}
            onPress={handleActivatePilot}
            disabled={activatingPass}
          >
            {activatingPass ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.activateBtnText}>Activate</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Search & Filter Bar */}
      <View style={[styles.searchSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchCapsule, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search robotics, IoT, green tech, business ideas..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadData}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); loadData(); }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Difficulty Chips */}
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.textTertiary }]}>DIFFICULTY:</Text>
          {DIFFICULTIES.map((diff) => {
            const isSelected = selectedDifficulty === diff;
            return (
              <TouchableOpacity
                key={diff}
                style={[
                  styles.filterChip,
                  isSelected && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                ]}
                onPress={() => setSelectedDifficulty(diff)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? colors.primary : colors.textSecondary },
                    isSelected && { fontWeight: FontWeight.bold },
                  ]}
                >
                  {diff}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 4. Category Filter Carousel */}
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

      {/* 5. Projects Stream */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading student project blueprints...</Text>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="bulb-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No projects match criteria</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Try clearing search filters to see all available tech and science guides.
            </Text>
          </View>
        ) : (
          <View style={[styles.grid, isDesktop && styles.desktopGrid]}>
            {projects.map((proj) => {
              const coverImg = proj.images && proj.images.length > 0 ? proj.images[0] : null;

              return (
                <TouchableOpacity
                  key={proj.id}
                  style={[
                    styles.projectCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isDesktop && styles.desktopProjectCard,
                  ]}
                  onPress={() => router.push(`/projects/${proj.id}` as any)}
                  activeOpacity={0.85}
                >
                  {/* Thumbnail Banner */}
                  <View style={[styles.cardThumb, { backgroundColor: colors.surfaceHighlight }]}>
                    {coverImg ? (
                      <Image source={{ uri: coverImg }} style={styles.cardImg} resizeMode="cover" />
                    ) : (
                      <Ionicons name="construct-outline" size={32} color={colors.textTertiary} />
                    )}

                    {/* Premium / Free Pill */}
                    <View
                      style={[
                        styles.tierBadge,
                        {
                          backgroundColor: proj.is_premium ? '#8B5CF6' : colors.success,
                        },
                      ]}
                    >
                      <Text style={styles.tierBadgeText}>{proj.is_premium ? 'ADVANCED TRACK' : 'FREE STARTER'}</Text>
                    </View>

                    {/* Difficulty */}
                    <View
                      style={[
                        styles.diffBadge,
                        { backgroundColor: (difficultyColors[proj.difficulty] || colors.primary) + '22', borderColor: difficultyColors[proj.difficulty] || colors.primary },
                      ]}
                    >
                      <Text style={[styles.diffBadgeText, { color: difficultyColors[proj.difficulty] || colors.primary }]}>
                        {proj.difficulty}
                      </Text>
                    </View>
                  </View>

                  {/* Body */}
                  <View style={styles.cardBody}>
                    <Text style={[styles.projCategory, { color: colors.primary }]}>{proj.category.toUpperCase()}</Text>
                    <Text style={[styles.projTitle, { color: colors.text }]} numberOfLines={2}>
                      {proj.title}
                    </Text>
                    <Text style={[styles.projDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {proj.description}
                    </Text>

                    {/* Metric row: Budget & Days */}
                    <View style={[styles.metricsRow, { borderTopColor: colors.border }]}>
                      <View style={styles.metricItem}>
                        <Ionicons name="wallet-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.metricText, { color: colors.text }]}>
                          Est: {proj.estimated_budget === 0 ? 'Free (Software)' : formatCurrency(proj.estimated_budget)}
                        </Text>
                      </View>

                      <View style={styles.metricItem}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.metricText, { color: colors.textSecondary }]}>
                          ~{proj.estimated_days} days
                        </Text>
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
  passPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  passPillText: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  passBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  passIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  passSub: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  activateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  activateBtnText: {
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipText: {
    fontSize: 10,
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
  projectCard: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 4,
  },
  desktopProjectCard: {
    width: '48.5%',
  },
  cardThumb: {
    width: '100%',
    height: 150,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  tierBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tierBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  diffBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  cardBody: {
    padding: Spacing.md,
  },
  projCategory: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  projTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    lineHeight: 20,
    marginBottom: 6,
  },
  projDesc: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
});

