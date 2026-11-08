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
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useAuth } from '@/context/AuthContext';
import { confirmAction } from '@/utils/confirm';
import {
  getProjects,
  getSubscriptionStatus,
  activatePilotSubscription,
  createProject,
  deleteProject,
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

  const [projects, setProjects] = useState<Project[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | ProjectDifficulty>('All');
  const [activatingPass, setActivatingPass] = useState(false);

  // Admin Project Creation State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Tech & Coding');
  const [newDifficulty, setNewDifficulty] = useState<ProjectDifficulty>('Beginner');
  const [newBudget, setNewBudget] = useState('');
  const [newDays, setNewDays] = useState('3');
  const [newDesc, setNewDesc] = useState('');
  const [newOutcome, setNewOutcome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateProject = async () => {
    if (!newTitle.trim() || newTitle.trim().length < 3) {
      Alert.alert('Notice', 'Project title is required (minimum 3 characters)');
      return;
    }
    try {
      setIsSubmitting(true);
      await createProject({
        title: newTitle.trim(),
        category: newCategory,
        difficulty: newDifficulty,
        estimated_budget: parseFloat(newBudget) || 0,
        estimated_days: parseInt(newDays, 10) || 1,
        description: newDesc.trim() || 'Hands-on student engineering project with guided steps and AI assistance.',
        expected_outcome: newOutcome.trim() || 'Working prototype verified by project mentor.',
        materials: [],
        steps: [],
        resources: [],
        images: [],
        is_premium: false,
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewBudget('');
      setNewDesc('');
      setNewOutcome('');
      // Reset active filters so the newly launched project is immediately visible
      setSelectedCategory('All');
      setSelectedDifficulty('All');
      setSearch('');
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeleteProject = (e: any, proj: Project) => {
    e?.stopPropagation?.();
    confirmAction(
      'Remove Project Blueprint',
      `Are you sure you want to remove "${proj.title}"? This will remove the blueprint from the catalog.`,
      'Remove Blueprint',
      async () => {
        try {
          await deleteProject(proj.id);
          Alert.alert('Project Removed', 'Project blueprint removed successfully.');
          loadData();
        } catch (err: any) {
          Alert.alert('Notice', err?.message || 'Failed to remove project');
        }
      },
      true
    );
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

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {subscription?.isPremium ? (
            <View style={[styles.passPill, { backgroundColor: '#8B5CF6' + '20', borderColor: '#8B5CF6' }]}>
              <Ionicons name="sparkles" size={13} color="#8B5CF6" />
              <Text style={[styles.passPillText, { color: '#8B5CF6' }]}>PILOT PASS ACTIVE</Text>
            </View>
          ) : null}

          {isAdmin && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#8B5CF6',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: BorderRadius.full,
                gap: 5,
              }}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold }}>Add Project</Text>
            </TouchableOpacity>
          )}
        </View>
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

                    {/* Author credit & delete button */}
                    <View style={[styles.authorFooterRow, { borderTopColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
                        <Ionicons name="sparkles" size={12} color={colors.primary} />
                        <Text style={[styles.authorCreditText, { color: colors.textSecondary }]} numberOfLines={1}>
                          Launched by <Text style={{ fontWeight: FontWeight.bold, color: colors.text }}>{proj.author_name || 'SPR Innovation Lab'}</Text>
                        </Text>
                      </View>

                      {(proj.created_by === user?.id || isAdmin) && (
                        <TouchableOpacity
                          style={[styles.projDeleteBtn, { borderColor: colors.expense + '40', backgroundColor: colors.expense + '10' }]}
                          onPress={(e) => handleDeleteProject(e, proj)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={12} color={colors.expense} />
                          <Text style={[styles.projDeleteText, { color: colors.expense }]}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Admin Add Project Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 520, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Add Innovation Project</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Owner & Administrator Authorized Catalog Entry</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>PROJECT TITLE *</Text>
              <TextInput
                style={{ backgroundColor: colors.surfaceElevated, color: colors.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}
                placeholder="e.g., Solar Mobile Charging Station"
                placeholderTextColor={colors.textTertiary}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>CATEGORY</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surfaceElevated, color: colors.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.border }}
                    placeholder="Tech & Coding"
                    placeholderTextColor={colors.textTertiary}
                    value={newCategory}
                    onChangeText={setNewCategory}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>DIFFICULTY</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {(['Beginner', 'Intermediate', 'Advanced'] as ProjectDifficulty[]).map((d) => (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setNewDifficulty(d)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                          backgroundColor: newDifficulty === d ? '#8B5CF6' : colors.surfaceElevated,
                          borderWidth: 1,
                          borderColor: newDifficulty === d ? '#8B5CF6' : colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '600', color: newDifficulty === d ? '#FFF' : colors.textSecondary }}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>EST. BUDGET (฿ THB)</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surfaceElevated, color: colors.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.border }}
                    placeholder="e.g., 450"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    value={newBudget}
                    onChangeText={setNewBudget}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>EST. DAYS</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surfaceElevated, color: colors.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.border }}
                    placeholder="e.g., 3"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    value={newDays}
                    onChangeText={setNewDays}
                  />
                </View>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>DESCRIPTION</Text>
              <TextInput
                style={{ backgroundColor: colors.surfaceElevated, color: colors.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.border, minHeight: 70, marginBottom: 12 }}
                placeholder="Overview of the project concept and skills learned..."
                placeholderTextColor={colors.textTertiary}
                multiline
                value={newDesc}
                onChangeText={setNewDesc}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>EXPECTED OUTCOME</Text>
              <TextInput
                style={{ backgroundColor: colors.surfaceElevated, color: colors.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.border, minHeight: 60, marginBottom: 16 }}
                placeholder="What the student finishes with..."
                placeholderTextColor={colors.textTertiary}
                multiline
                value={newOutcome}
                onChangeText={setNewOutcome}
              />
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateProject}
                disabled={isSubmitting}
                style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Publish Project</Text>
                  </>
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
  authorFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  authorCreditText: {
    fontSize: 10,
  },
  projDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  projDeleteText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
});

