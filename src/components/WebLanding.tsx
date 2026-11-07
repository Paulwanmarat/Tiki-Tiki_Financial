import { LOCAL_API_URL } from '@/services/ai/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SurveyResults } from './SurveyResults';
import { LiveWebImpactSection } from './impact/LiveWebImpactSection';
import { PIGGY_LOGO, SCHOOL_LOGO, ANTHONY_PHOTO } from '@/constants/assets';

/* ───────────────────────────────────────────────────────────────── */
/*  FadeInSection — Scroll-triggered fade + slide-up transition     */
/* ───────────────────────────────────────────────────────────────── */
function FadeInSection({
  children,
  delay = 0,
  scrollY,
  triggerY,
}: {
  children: React.ReactNode;
  delay?: number;
  scrollY: number;
  triggerY: number | undefined;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(36)).current;
  const hasAnimated = useRef(false);

  const viewportHeight = Dimensions.get('window').height;
  const isVisible = scrollY + viewportHeight > (triggerY ?? 99999) + 80;

  useEffect(() => {
    if (isVisible && !hasAnimated.current) {
      hasAnimated.current = true;
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 680,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 680,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

/* ───────────────────────────────────────────────────────────────── */
/*  SPR MONEY STUDIO — DESIGN SYSTEM TOKENS                          */
/*  Refined Institutional Fintech Palette & Authentic Brand Assets   */
/* ───────────────────────────────────────────────────────────────── */
const S = {
  // Deep Obsidian & Slate Canvas (Authoritative Financial Canvas)
  canvasDark: '#0B0F17',
  canvasDarkAlt: '#111827',
  canvasDarkCard: '#182234',
  canvasDarkBorder: '#222F46',
  canvasDarkHover: '#293548',

  // Tactile Paper Ledger Canvas (for sketch/ledger contrast)
  paper: '#FAF6F0',
  paperWarm: '#FFFDF9',
  paperMuted: '#F1EAE0',
  paperBorder: '#E2E8F0',
  paperRuled: '#CBD5E1',

  // Mascot Piggy Palette (Dignified Rose sampled from PiggyLogo)
  piggyPink: '#E11D48',
  piggyPinkLight: '#F43F5E',
  piggyPinkDark: '#BE123C',
  piggyPinkGlow: 'rgba(225, 29, 72, 0.16)',
  piggyPinkSubtle: 'rgba(225, 29, 72, 0.1)',
  piggyBlush: '#FFE4E6',
  piggyBlushBg: '#FFF1F2',
  piggyRose: '#E11D48',

  // Studio Ledger Accents
  amberCoin: '#D97706',
  amberCoinLight: '#F59E0B',
  amberCoinGlow: 'rgba(217, 119, 6, 0.18)',
  mintCash: '#10B981',
  mintCashBg: 'rgba(16, 185, 129, 0.14)',
  coralWarning: '#EF4444',
  coralWarningBg: 'rgba(239, 68, 68, 0.14)',
  blueprintBlue: '#2563EB',

  // Typography Tones (High Contrast Institutional Slate)
  inkPrimary: '#0F172A',
  inkSecondary: '#475569',
  inkMuted: '#64748B',
  textLight: '#F8FAFC',
  textLightSecondary: '#94A3B8',
  textLightMuted: '#64748B',
};

/* ───────────────────────────────────────────────────────────────── */
/*  Main Component                                                   */
/* ───────────────────────────────────────────────────────────────── */
export function WebLanding() {
  const router = useRouter();
  const windowWidth = Dimensions.get('window').width;
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const scrollRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<Record<string, number>>({});
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(6000);

  const scrollTo = useCallback((key: string) => {
    const y = sectionRefs.current[key];
    if (y !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, y - 76), animated: true });
    }
  }, []);

  const onLayout = useCallback((key: string, y: number) => {
    sectionRefs.current[key] = y;
  }, []);

  // Compute active navigation section based on scroll offset
  let activeNavKey = 'top';

  if (scrollY >= (sectionRefs.current['impact'] || 5200) - 200) {
    activeNavKey = 'impact';
  } else if (scrollY >= (sectionRefs.current['team'] || 4800) - 200) {
    activeNavKey = 'team';
  } else if (scrollY >= (sectionRefs.current['research'] || 4200) - 200) {
    activeNavKey = 'research';
  } else if (scrollY >= (sectionRefs.current['ai'] || 3600) - 200) {
    activeNavKey = 'ai';
  } else if (scrollY >= (sectionRefs.current['goals'] || 3000) - 200) {
    activeNavKey = 'goals';
  } else if (scrollY >= (sectionRefs.current['simulator'] || 2200) - 200) {
    activeNavKey = 'simulator';
  } else if (scrollY >= (sectionRefs.current['ledger'] || 1400) - 200) {
    activeNavKey = 'ledger';
  } else if (scrollY >= (sectionRefs.current['problem'] || 600) - 200) {
    activeNavKey = 'problem';
  }

  const scrollProgress = Math.min(100, Math.max(0, (scrollY / Math.max(1, contentHeight - 800)) * 100));

  return (
    <View style={pageStyles.root}>
      {/* Studio Navigation Bar with Laser Progress */}
      <StudioNavBar
        isMobile={isMobile}
        scrollTo={scrollTo}
        onOpenApp={() => router.push('/app')}
        scrollProgress={scrollProgress}
        activeKey={activeNavKey}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={pageStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        onContentSizeChange={(_, h) => setContentHeight(h)}
      >
        {/* HERO: "Your money. Your canvas." */}
        <StudioHeroSection
          isMobile={isMobile}
          isTablet={isTablet}
          scrollTo={scrollTo}
          onOpenApp={() => router.push('/app')}
        />

        {/* SECTION A: The Everyday Money Problem (The Micro-Expense Avalanche) */}
        <View onLayout={(e) => onLayout('problem', e.nativeEvent.layout.y)}>
          <FadeInSection scrollY={scrollY} triggerY={sectionRefs.current['problem']}>
            <MicroExpenseAvalancheSection isMobile={isMobile} isTablet={isTablet} />
          </FadeInSection>
        </View>

        {/* SECTION B: Understand Your Money (The 3-Pillar Ledger System) */}
        <View onLayout={(e) => onLayout('ledger', e.nativeEvent.layout.y)}>
          <FadeInSection scrollY={scrollY} triggerY={sectionRefs.current['ledger']} delay={60}>
            <ThreePillarLedgerSection isMobile={isMobile} isTablet={isTablet} />
          </FadeInSection>
        </View>

        {/* SECTION 04: Complete Student Financial Ecosystem */}
        <View onLayout={(e) => onLayout('ecosystem', e.nativeEvent.layout.y)}>
          <FadeInSection scrollY={scrollY} triggerY={sectionRefs.current['ecosystem']}>
            <StudioEcosystemSection
              isMobile={isMobile}
              isTablet={isTablet}
              onNavigate={(route) => router.push(route as any)}
            />
          </FadeInSection>
        </View>

        {/* SECTION C: The Interactive Spending Simulator */}
        <View onLayout={(e) => onLayout('simulator', e.nativeEvent.layout.y)}>
          <FadeInSection scrollY={scrollY} triggerY={sectionRefs.current['simulator']}>
            <InteractiveSpendingSimulatorSection isMobile={isMobile} isTablet={isTablet} />
          </FadeInSection>
        </View>

        {/* SECTION D: Plan & Save (The Piggy Vault) */}
        <View onLayout={(e) => onLayout('goals', e.nativeEvent.layout.y)}>
          <FadeInSection scrollY={scrollY} triggerY={sectionRefs.current['goals']} delay={40}>
            <PiggyVaultSection isMobile={isMobile} isTablet={isTablet} />
          </FadeInSection>
        </View>

        {/* SECTION E: Menu Scanner & AI Financial Assistant */}
        <View onLayout={(e) => onLayout('ai', e.nativeEvent.layout.y)}>
          <FadeInSection scrollY={scrollY} triggerY={sectionRefs.current['ai']}>
            <AIVisionSection isMobile={isMobile} isTablet={isTablet} />
          </FadeInSection>
        </View>

        {/* SECTION F: Survey Research */}
        <View onLayout={(e) => onLayout('research', e.nativeEvent.layout.y)}>
          <FadeInSection scrollY={scrollY} triggerY={sectionRefs.current['research']} delay={40}>
            <StudioResearchSection isMobile={isMobile} isTablet={isTablet} />
          </FadeInSection>
        </View>

        {/* SECTION G: Team and Project Advisor */}
        <View onLayout={(e) => onLayout('team', e.nativeEvent.layout.y)}>
          <FadeInSection scrollY={scrollY} triggerY={sectionRefs.current['team']}>
            <StudioTeamSection isMobile={isMobile} isTablet={isTablet} />
          </FadeInSection>
        </View>

        {/* SECTION H: Live Community Impact & Verified Transparency (฿ THB) */}
        <View onLayout={(e) => onLayout('impact', e.nativeEvent.layout.y)}>
          <FadeInSection scrollY={scrollY} triggerY={sectionRefs.current['impact']} delay={60}>
            <LiveWebImpactSection isMobile={isMobile} isTablet={isTablet} />
          </FadeInSection>
        </View>

        {/* SECTION I: Feedback Box */}
        <View onLayout={(e) => onLayout('feedback', e.nativeEvent.layout.y)}>
          <FadeInSection scrollY={scrollY} triggerY={sectionRefs.current['feedback']}>
            <StudioFeedbackSection isMobile={isMobile} />
          </FadeInSection>
        </View>

        {/* Final Studio Call to Action & Footer */}
        <StudioFinalCTA onOpenApp={() => router.push('/app')} isMobile={isMobile} />
        <StudioFooter isMobile={isMobile} scrollTo={scrollTo} />
      </ScrollView>
    </View>
  );
}

/* ───────────────────────────────────────────────────────────────── */
/*  Studio Navigation Bar                                           */
/* ───────────────────────────────────────────────────────────────── */
function StudioNavBar({
  isMobile,
  scrollTo,
  onOpenApp,
  scrollProgress = 0,
  activeKey = 'top',
}: {
  isMobile: boolean;
  scrollTo: (key: string) => void;
  onOpenApp: () => void;
  scrollProgress?: number;
  activeKey?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: 'The Problem', key: 'problem' },
    { label: '3-Pillars', key: 'ledger' },
    { label: 'Ecosystem', key: 'ecosystem' },
    { label: 'Simulator', key: 'simulator' },
    { label: 'Piggy Vault', key: 'goals' },
    { label: 'Menu OCR', key: 'ai' },
    { label: 'Research', key: 'research' },
    { label: 'Team', key: 'team' },
    { label: 'Impact (฿)', key: 'impact' },
  ];

  return (
    <View style={navStyles.wrapper}>
      {/* Reading Progress Line */}
      <View style={[navStyles.progressLine, { width: `${scrollProgress}%` as any }]} />

      <View style={navStyles.container}>
        {/* Brand Emblem & Institutional Affiliation */}
        <TouchableOpacity
          style={navStyles.brand}
          onPress={() => scrollTo('top')}
          activeOpacity={0.8}
        >
          <View style={navStyles.logoFrame}>
            <Image
              source={PIGGY_LOGO}
              style={navStyles.logoImage}
              alt="Official SPR Piggy Logo"
            />
          </View>
          <View>
            <View style={navStyles.brandRow}>
              <Text style={navStyles.brandTitle}>SPR</Text>
              <Text style={navStyles.brandStudioBadge}>MONEY STUDIO</Text>
            </View>
            <Text style={navStyles.brandSub}>Student Pecuniary Routine</Text>
          </View>

          {/* Hairline Divider & Saipanyarangsit Crest */}
          {!isMobile && (
            <>
              <View style={navStyles.brandDivider} />
              <View style={navStyles.schoolBrandRow}>
                <View style={navStyles.schoolLogoFrame}>
                  <Image
                    source={SCHOOL_LOGO}
                    style={navStyles.schoolLogoImage}
                    alt="Saipanyarangsit School Logo"
                  />
                </View>
                <View>
                  <Text style={navStyles.schoolBrandTitle}>Saipanyarangsit</Text>
                  <Text style={navStyles.schoolBrandSub}>MEP Faculty Project</Text>
                </View>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Desktop Links */}
        {!isMobile && (
          <View style={navStyles.links}>
            {navItems.map((item) => {
              const isActive = activeKey === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => scrollTo(item.key)}
                  style={[navStyles.link, isActive && navStyles.linkActive]}
                >
                  <Text
                    style={[
                      navStyles.linkText,
                      isActive && navStyles.linkTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* CTA & Mobile Toggle */}
        <View style={navStyles.actions}>
          <TouchableOpacity
            style={navStyles.ctaBtn}
            onPress={onOpenApp}
            activeOpacity={0.85}
          >
            <Text style={navStyles.ctaBtnText}>Open App</Text>
            <Ionicons name="arrow-forward" size={15} color="#FFF" />
          </TouchableOpacity>

          {isMobile && (
            <TouchableOpacity
              onPress={() => setMenuOpen(!menuOpen)}
              style={navStyles.menuToggle}
            >
              <Ionicons name={menuOpen ? 'close' : 'menu'} size={24} color={S.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mobile Menu Dropdown */}
      {isMobile && menuOpen && (
        <View style={navStyles.mobileMenu}>
          {navItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => {
                setMenuOpen(false);
                scrollTo(item.key);
              }}
              style={navStyles.mobileMenuItem}
            >
              <Text style={navStyles.mobileMenuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[navStyles.ctaBtn, { marginTop: 12, justifyContent: 'center' }]}
            onPress={onOpenApp}
          >
            <Text style={navStyles.ctaBtnText}>Launch Web App</Text>
            <Ionicons name="arrow-forward" size={15} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ───────────────────────────────────────────────────────────────── */
/*  Institutional Navigation Styles                                 */
const navStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: 'rgba(11, 15, 23, 0.97)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 47, 70, 0.9)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
    } as any : {}),
  },
  progressLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: S.piggyPink,
    zIndex: 1000,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '6%' as any,
    height: 72,
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: S.piggyPink,
    backgroundColor: '#000',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: S.textLight,
    letterSpacing: 0.5,
  },
  brandStudioBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: S.piggyPink,
    letterSpacing: 1.5,
    backgroundColor: S.piggyPinkSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  brandSub: {
    fontSize: 10,
    color: S.textLightMuted,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  brandDivider: {
    width: 1,
    height: 28,
    backgroundColor: S.canvasDarkBorder,
    marginHorizontal: 6,
  },
  schoolBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  schoolLogoFrame: {
    width: 32,
    height: 32,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schoolLogoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  schoolBrandTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: S.textLight,
  },
  schoolBrandSub: {
    fontSize: 9,
    color: S.textLightMuted,
    letterSpacing: 0.2,
  },
  links: {
    flexDirection: 'row',
    gap: 22,
  },
  link: {
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: S.textLightSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: S.piggyPink,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 99,
    shadowColor: S.piggyPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  ctaBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  menuToggle: {
    padding: 6,
  },
  mobileMenu: {
    backgroundColor: S.canvasDarkAlt,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: S.canvasDarkBorder,
  },
  mobileMenuItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: S.canvasDarkBorder,
  },
  mobileMenuText: {
    fontSize: 15,
    fontWeight: '600',
    color: S.textLight,
  },
  linkActive: {
    borderBottomWidth: 2,
    borderBottomColor: S.piggyPink,
  },
  linkTextActive: {
    color: S.piggyPink,
    fontWeight: '800',
  },
});

/* ───────────────────────────────────────────────────────────────── */
/*  HERO SECTION: "Your money. Your canvas."                        */
/* ───────────────────────────────────────────────────────────────── */
function StudioHeroSection({
  isMobile,
  isTablet,
  scrollTo,
  onOpenApp,
}: {
  isMobile: boolean;
  isTablet: boolean;
  scrollTo: (key: string) => void;
  onOpenApp: () => void;
}) {
  // Interactive Studio Mode: toggles live financial ledger demonstration
  const [heroMode, setHeroMode] = useState<'weekday' | 'weekend'>('weekday');

  const ledgerData =
    heroMode === 'weekday'
      ? {
          title: 'SESSION 01 · MON-FRI CAMPUS LEDGER',
          budget: '฿150.00',
          spent: '฿120.00',
          remaining: '฿30.00',
          status: 'SAFE · ON TRACK',
          items: [
            { time: '07:45 AM', label: 'Morning Iced Cocoa', amt: '-฿35.00', cat: 'food' },
            { time: '12:20 PM', label: 'Canteen Chicken Rice', amt: '-฿50.00', cat: 'food' },
            { time: '16:15 PM', label: 'Post-Class Milk Tea', amt: '-฿35.00', cat: 'discretionary' },
          ],
        }
      : {
          title: 'SESSION 02 · RESEARCH LAB SESSION',
          budget: '฿300.00',
          spent: '฿230.00',
          remaining: '฿70.00',
          status: 'SAFE · PROJECT COVERED',
          items: [
            { time: '10:30 AM', label: 'Poster Board & Markers', amt: '-฿95.00', cat: 'education' },
            { time: '13:00 PM', label: 'Group Project Lunch', amt: '-฿75.00', cat: 'food' },
            { time: '15:30 PM', label: 'Transit BTS Pass', amt: '-฿60.00', cat: 'transit' },
          ],
        };

  return (
    <View style={[heroStyles.section, isMobile && heroStyles.sectionMobile]}>
      <View style={[heroStyles.grid, isMobile && heroStyles.gridMobile]}>
        {/* Left Editorial Text Column */}
        <View style={[heroStyles.leftCol, isMobile && heroStyles.leftColMobile]}>
          {/* Eyebrow Stamp */}
          <View style={heroStyles.eyebrowStamp}>
            <View style={heroStyles.eyebrowDot} />
            <Text style={heroStyles.eyebrowText}>STUDENT PECUNIARY ROUTINE · MEP LAB</Text>
          </View>

          {/* Main Statement */}
          <Text style={[heroStyles.headline, isMobile && heroStyles.headlineMobile]}>
            Your money.{'\n'}
            <Text style={{ color: S.piggyPink }}>Your canvas.</Text>
          </Text>

          {/* Editorial Subtext */}
          <Text style={heroStyles.subhead}>
            Students don’t need complicated corporate banking tools. SPR is a tactile, creative
            financial studio designed to reveal where daily cash evaporates, simulate purchases
            before tapping pay, and transform spare bahts into real goals.
          </Text>

          {/* Interactive Mode Switcher */}
          <View style={heroStyles.modeSwitchWrap}>
            <Text style={heroStyles.modeSwitchLabel}>SIMULATE REAL STUDENT CONTEXT:</Text>
            <View style={heroStyles.modeSwitchRow}>
              <TouchableOpacity
                onPress={() => setHeroMode('weekday')}
                style={[
                  heroStyles.modeBtn,
                  heroMode === 'weekday' && heroStyles.modeBtnActive,
                ]}
              >
                <Text
                  style={[
                    heroStyles.modeBtnText,
                    heroMode === 'weekday' && heroStyles.modeBtnTextActive,
                  ]}
                >
                  [ 01 · CAMPUS ROUTINE ]
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setHeroMode('weekend')}
                style={[
                  heroStyles.modeBtn,
                  heroMode === 'weekend' && heroStyles.modeBtnActive,
                ]}
              >
                <Text
                  style={[
                    heroStyles.modeBtnText,
                    heroMode === 'weekend' && heroStyles.modeBtnTextActive,
                  ]}
                >
                  [ 02 · RESEARCH LAB ]
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action CTAs */}
          <View style={[heroStyles.ctaRow, isMobile && heroStyles.ctaRowMobile]}>
            <TouchableOpacity style={heroStyles.primaryBtn} onPress={onOpenApp} activeOpacity={0.85}>
              <Text style={heroStyles.primaryBtnText}>Launch Web App</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={heroStyles.secondaryBtn}
              onPress={() => scrollTo('simulator')}
              activeOpacity={0.8}
            >
              <Ionicons name="calculator-outline" size={18} color={S.piggyPink} />
              <Text style={heroStyles.secondaryBtnText}>Try Spending Simulator</Text>
            </TouchableOpacity>
          </View>

          {/* Supervised by stamp */}
          <View style={heroStyles.advisorTag}>
            <Ionicons name="ribbon-outline" size={16} color={S.amberCoin} />
            <Text style={heroStyles.advisorTagText}>
              Saipanyarangsit MEP Project · Advised by{' '}
              <Text style={{ fontWeight: '700', color: S.textLight }}>Mr. Anthony Jose B. Ferrer</Text>
            </Text>
          </View>

          {/* Studio Upgrade Highlights */}
          <View style={heroStyles.featurePillsRow}>
            <View style={heroStyles.featurePill}>
              <Ionicons name="flash-outline" size={12} color={S.mintCash} />
              <Text style={heroStyles.featurePillText}>Instant Live Data Sync</Text>
            </View>
            <View style={heroStyles.featurePill}>
              <Ionicons name="globe-outline" size={12} color={S.piggyPink} />
              <Text style={heroStyles.featurePillText}>18 Global Currencies</Text>
            </View>
            <View style={heroStyles.featurePill}>
              <Ionicons name="calendar-outline" size={12} color={S.amberCoin} />
              <Text style={heroStyles.featurePillText}>Smart Touch Date Picker</Text>
            </View>
            <View style={heroStyles.featurePill}>
              <Ionicons name="sparkles-outline" size={12} color="#A78BFA" />
              <Text style={heroStyles.featurePillText}>Unified Goals & AI Chats</Text>
            </View>
          </View>
        </View>

        {/* Right Studio Financial Scene */}
        <View style={[heroStyles.rightCol, isMobile && heroStyles.rightColMobile]}>
          {/* Studio Mascot Emblem Card */}
          <View style={heroStyles.mascotCard}>
            <View style={heroStyles.mascotRow}>
              <View style={heroStyles.mascotAvatarWrap}>
                <Image
                  source={PIGGY_LOGO}
                  style={heroStyles.mascotImage}
                  alt="SPR Piggy Mascot"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={heroStyles.mascotLabel}>PIGGY POCKETS VAULT</Text>
                <Text style={heroStyles.mascotBalance}>฿4,300.00</Text>
                <Text style={heroStyles.mascotSub}>Total Student Net Liquidity</Text>
              </View>
              <View style={heroStyles.mascotStatusPill}>
                <View style={heroStyles.statusDot} />
                <Text style={heroStyles.statusText}>HEALTHY</Text>
              </View>
            </View>
          </View>

          {/* Tactile Receipt / Ledger Strip */}
          <View style={heroStyles.receiptCard}>
            {/* Perforated Top Edge */}
            <View style={heroStyles.perforatedTop}>
              {Array.from({ length: 18 }).map((_, i) => (
                <View key={i} style={heroStyles.perforatedHole} />
              ))}
            </View>

            <View style={heroStyles.receiptBody}>
              <View style={heroStyles.receiptHeader}>
                <Text style={heroStyles.receiptTitle}>{ledgerData.title}</Text>
                <Text style={heroStyles.receiptBadge}>{ledgerData.status}</Text>
              </View>

              {/* Transactions List */}
              <View style={heroStyles.receiptItems}>
                {ledgerData.items.map((item, idx) => (
                  <View key={idx} style={heroStyles.receiptRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={heroStyles.itemLabel}>{item.label}</Text>
                      <Text style={heroStyles.itemTime}>{item.time}</Text>
                    </View>
                    <Text style={heroStyles.itemAmt}>{item.amt}</Text>
                  </View>
                ))}
              </View>

              {/* Ledger Math Summary */}
              <View style={heroStyles.receiptDivider} />
              <View style={heroStyles.receiptSummary}>
                <View style={heroStyles.summaryRow}>
                  <Text style={heroStyles.summaryLabel}>Daily Guardrail Limit</Text>
                  <Text style={heroStyles.summaryVal}>{ledgerData.budget}</Text>
                </View>
                <View style={heroStyles.summaryRow}>
                  <Text style={heroStyles.summaryLabel}>Micro-Purchases Today</Text>
                  <Text style={[heroStyles.summaryVal, { color: S.coralWarning }]}>
                    {ledgerData.spent}
                  </Text>
                </View>
                <View style={[heroStyles.summaryRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: S.canvasDarkBorder }]}>
                  <Text style={[heroStyles.summaryLabel, { fontWeight: '800', color: S.textLight }]}>
                    Discretionary Buffer Left
                  </Text>
                  <Text style={[heroStyles.summaryVal, { fontWeight: '900', color: S.mintCash, fontSize: 16 }]}>
                    {ledgerData.remaining}
                  </Text>
                </View>
              </View>
            </View>

            {/* Perforated Bottom Edge */}
            <View style={heroStyles.perforatedBottom}>
              {Array.from({ length: 18 }).map((_, i) => (
                <View key={i} style={heroStyles.perforatedHole} />
              ))}
            </View>
          </View>

          {/* Goal Progress Pin */}
          <View style={heroStyles.goalPinCard}>
            <View style={heroStyles.goalIconWrap}>
              <Ionicons name="laptop-outline" size={20} color={S.amberCoin} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={heroStyles.goalHeader}>
                <Text style={heroStyles.goalTitle}>Goal: Coding & School Laptop</Text>
                <Text style={heroStyles.goalPct}>25%</Text>
              </View>
              <View style={heroStyles.progressBarBg}>
                <View style={[heroStyles.progressBarFill, { width: '25%' }]} />
              </View>
              <Text style={heroStyles.goalMeta}>฿5,000 / ฿20,000 · ฿250/week on track</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  section: {
    paddingTop: 140,
    paddingBottom: 100,
    paddingHorizontal: '6%' as any,
    backgroundColor: S.canvasDark,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: S.canvasDarkBorder,
  },
  sectionMobile: {
    paddingTop: 108,
    paddingBottom: 60,
    paddingHorizontal: 20,
  },
  grid: {
    flexDirection: 'row',
    maxWidth: 1260,
    width: '100%',
    gap: 48,
    alignItems: 'center',
  },
  gridMobile: {
    flexDirection: 'column',
    gap: 40,
  },
  leftCol: {
    flex: 1.1,
  },
  leftColMobile: {
    alignItems: 'flex-start',
  },
  eyebrowStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: S.canvasDarkCard,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: S.piggyPink,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.piggyPink,
    letterSpacing: 1.5,
  },
  headline: {
    fontSize: 54,
    fontWeight: '900',
    color: S.textLight,
    lineHeight: 62,
    letterSpacing: -1,
    marginBottom: 20,
  },
  headlineMobile: {
    fontSize: 38,
    lineHeight: 46,
  },
  subhead: {
    fontSize: 17,
    lineHeight: 28,
    color: S.textLightSecondary,
    marginBottom: 28,
    maxWidth: 580,
  },
  modeSwitchWrap: {
    backgroundColor: S.canvasDarkCard,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    marginBottom: 28,
    maxWidth: 540,
  },
  modeSwitchLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: S.textLightMuted,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  modeSwitchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: S.canvasDarkAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeBtnActive: {
    backgroundColor: S.piggyPinkSubtle,
    borderColor: S.piggyPink,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: S.textLightSecondary,
  },
  modeBtnTextActive: {
    color: S.piggyPink,
    fontWeight: '800',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  ctaRowMobile: {
    flexDirection: 'column',
    width: '100%',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: S.piggyPink,
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 99,
    shadowColor: S.piggyPink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    backgroundColor: S.canvasDarkCard,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: S.textLight,
  },
  advisorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  advisorTagText: {
    fontSize: 12,
    color: S.textLightMuted,
  },
  featurePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: S.canvasDarkCard,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: S.textLight,
    letterSpacing: 0.2,
  },
  rightCol: {
    flex: 0.95,
    gap: 18,
    width: '100%',
  },
  rightColMobile: {
    maxWidth: 480,
    alignSelf: 'center',
  },
  mascotCard: {
    backgroundColor: S.canvasDarkCard,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mascotAvatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: S.piggyPink,
    backgroundColor: '#000',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mascotLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: S.piggyPink,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  mascotBalance: {
    fontSize: 26,
    fontWeight: '900',
    color: S.textLight,
    letterSpacing: -0.5,
  },
  mascotSub: {
    fontSize: 11,
    color: S.textLightMuted,
  },
  mascotStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: S.mintCashBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: S.mintCash,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: S.mintCash,
    letterSpacing: 0.5,
  },
  receiptCard: {
    backgroundColor: S.canvasDarkAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    overflow: 'hidden',
  },
  perforatedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  perforatedBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  perforatedHole: {
    width: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: S.canvasDarkBorder,
  },
  receiptBody: {
    padding: 20,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: S.textLight,
  },
  receiptBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: S.mintCash,
    backgroundColor: S.mintCashBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  receiptItems: {
    gap: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: S.textLight,
  },
  itemTime: {
    fontSize: 11,
    color: S.textLightMuted,
    marginTop: 2,
  },
  itemAmt: {
    fontSize: 14,
    fontWeight: '800',
    color: S.coralWarning,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: S.canvasDarkBorder,
    marginVertical: 14,
    borderStyle: 'dashed',
  },
  receiptSummary: {
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: S.textLightSecondary,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: S.textLight,
  },
  goalPinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: S.canvasDarkCard,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  goalIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: S.amberCoinGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: S.textLight,
  },
  goalPct: {
    fontSize: 12,
    fontWeight: '800',
    color: S.amberCoin,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: S.canvasDarkAlt,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: S.amberCoin,
    borderRadius: 3,
  },
  goalMeta: {
    fontSize: 11,
    color: S.textLightMuted,
  },
});

/* ───────────────────────────────────────────────────────────────── */
/*  SECTION A: The Micro-Expense Avalanche                          */
/* ───────────────────────────────────────────────────────────────── */
function MicroExpenseAvalancheSection({
  isMobile,
  isTablet,
}: {
  isMobile: boolean;
  isTablet: boolean;
}) {
  return (
    <View style={[storyStyles.section, isMobile && storyStyles.sectionMobile]}>
      <View style={storyStyles.container}>
        <View style={storyStyles.badgeWrap}>
          <Text style={storyStyles.badgeText}>SECTION 01 · THE PROBLEM</Text>
        </View>

        <Text style={[storyStyles.heading, isMobile && { fontSize: 30, lineHeight: 38 }]}>
          The Micro-Expense Avalanche
        </Text>
        <Text style={storyStyles.subhead}>
          Students rarely run out of money on major emergencies. We go broke because small
          canteen purchases, milk teas, and bus fares feel so tiny in isolation that they slip
          right past our mental budget.
        </Text>

        <View style={[storyStyles.ticketGrid, isMobile && storyStyles.ticketGridMobile]}>
          {/* Tangible Receipt of the ฿200 Allowance */}
          <View style={storyStyles.receiptBox}>
            <View style={storyStyles.receiptTopBar}>
              <Text style={storyStyles.receiptStore}>CANTEEN & SNACK SLIP — MARCH 14</Text>
              <Text style={storyStyles.receiptSerial}>#STU-8841</Text>
            </View>

            <View style={storyStyles.receiptItemsWrap}>
              <View style={storyStyles.receiptRow}>
                <View>
                  <Text style={storyStyles.receiptItemName}>07:30 AM · Iced Milk & Toast</Text>
                  <Text style={storyStyles.receiptItemCat}>Breakfast snack</Text>
                </View>
                <Text style={storyStyles.receiptItemPrice}>-฿35.00</Text>
              </View>

              <View style={storyStyles.receiptRow}>
                <View>
                  <Text style={storyStyles.receiptItemName}>10:15 AM · Snack Bar Cracker</Text>
                  <Text style={storyStyles.receiptItemCat}>Recess nibble</Text>
                </View>
                <Text style={storyStyles.receiptItemPrice}>-฿20.00</Text>
              </View>

              <View style={storyStyles.receiptRow}>
                <View>
                  <Text style={storyStyles.receiptItemName}>12:15 PM · Lunch Special + Lemon Tea</Text>
                  <Text style={storyStyles.receiptItemCat}>Main meal</Text>
                </View>
                <Text style={storyStyles.receiptItemPrice}>-฿65.00</Text>
              </View>

              <View style={storyStyles.receiptRow}>
                <View>
                  <Text style={storyStyles.receiptItemName}>15:45 PM · Boba Milk Tea with Friends</Text>
                  <Text style={storyStyles.receiptItemCat}>Social treat</Text>
                </View>
                <Text style={storyStyles.receiptItemPrice}>-฿45.00</Text>
              </View>

              <View style={storyStyles.receiptRow}>
                <View>
                  <Text style={storyStyles.receiptItemName}>17:00 PM · Science Poster Cardboard</Text>
                  <Text style={storyStyles.receiptItemCat}>Class project supplies</Text>
                </View>
                <Text style={storyStyles.receiptItemPrice}>-฿80.00</Text>
              </View>
            </View>

            {/* Total Stamped Box */}
            <View style={storyStyles.receiptTotalBox}>
              <View style={storyStyles.totalLine}>
                <Text style={storyStyles.totalLabel}>Daily Allowance Received:</Text>
                <Text style={storyStyles.totalValue}>฿200.00</Text>
              </View>
              <View style={storyStyles.totalLine}>
                <Text style={storyStyles.totalLabel}>Accumulated Small Spending:</Text>
                <Text style={[storyStyles.totalValue, { color: S.coralWarning }]}>-฿245.00</Text>
              </View>
              <View style={storyStyles.stampOverbudget}>
                <Text style={storyStyles.stampOverbudgetText}>[ CRITICAL OVERRUN ] -฿45.00 BEFORE 18:00 HRS</Text>
              </View>
            </View>
          </View>

          {/* Editorial Commentary Side */}
          <View style={storyStyles.commentaryCol}>
            <View style={storyStyles.commentCard}>
              <View style={storyStyles.commentIconWrap}>
                <Ionicons name="eye-off-outline" size={24} color={S.piggyPink} />
              </View>
              <Text style={storyStyles.commentTitle}>1. The "Only ฿40" Illusion</Text>
              <Text style={storyStyles.commentDesc}>
                A ฿40 drink feels harmless when you have ฿200 in your pocket. But buying it three
                times a week costs ฿480/month—more than an entire semester’s classroom project supplies.
              </Text>
            </View>

            <View style={storyStyles.commentCard}>
              <View style={storyStyles.commentIconWrap}>
                <Ionicons name="trending-down-outline" size={24} color={S.amberCoin} />
              </View>
              <Text style={storyStyles.commentTitle}>2. Goal Cannibalization</Text>
              <Text style={storyStyles.commentDesc}>
                When unplanned daily expenses exceed your day’s limit, the money has to come from
                somewhere: your savings jar. That’s why student goals quietly get pushed back month
                after month.
              </Text>
            </View>

            <View style={storyStyles.commentCard}>
              <View style={storyStyles.commentIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={24} color={S.mintCash} />
              </View>
              <Text style={storyStyles.commentTitle}>3. How SPR Fixes It</Text>
              <Text style={storyStyles.commentDesc}>
                SPR replaces vague guilt with a dynamic Daily Guardrail and instant Simulation.
                Before you buy, you see exactly how many days of laptop progress you’re trading away.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const storyStyles = StyleSheet.create({
  section: {
    paddingVertical: 90,
    paddingHorizontal: '6%' as any,
    backgroundColor: S.canvasDarkAlt,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: S.canvasDarkBorder,
  },
  sectionMobile: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  container: {
    maxWidth: 1200,
    width: '100%',
    alignItems: 'center',
  },
  badgeWrap: {
    backgroundColor: S.piggyPinkSubtle,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.piggyPink,
    letterSpacing: 1.5,
  },
  heading: {
    fontSize: 40,
    fontWeight: '900',
    color: S.textLight,
    textAlign: 'center',
    marginBottom: 14,
  },
  subhead: {
    fontSize: 16,
    lineHeight: 26,
    color: S.textLightSecondary,
    textAlign: 'center',
    maxWidth: 680,
    marginBottom: 48,
  },
  ticketGrid: {
    flexDirection: 'row',
    gap: 36,
    width: '100%',
    alignItems: 'flex-start',
  },
  ticketGridMobile: {
    flexDirection: 'column',
  },
  receiptBox: {
    flex: 1,
    backgroundColor: S.paper,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: S.paperBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  receiptTopBar: {
    borderBottomWidth: 1,
    borderBottomColor: S.paperRuled,
    paddingBottom: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptStore: {
    fontSize: 11,
    fontWeight: '800',
    color: S.inkPrimary,
    letterSpacing: 0.8,
  },
  receiptSerial: {
    fontSize: 11,
    fontWeight: '700',
    color: S.inkMuted,
  },
  receiptItemsWrap: {
    gap: 14,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: S.inkPrimary,
  },
  receiptItemCat: {
    fontSize: 11,
    color: S.inkMuted,
    marginTop: 2,
  },
  receiptItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: S.coralWarning,
  },
  receiptTotalBox: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: S.inkPrimary,
    gap: 6,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: S.inkSecondary,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: S.inkPrimary,
  },
  stampOverbudget: {
    backgroundColor: S.coralWarningBg,
    borderWidth: 1,
    borderColor: S.coralWarning,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  stampOverbudgetText: {
    fontSize: 12,
    fontWeight: '900',
    color: S.coralWarning,
    letterSpacing: 0.5,
  },
  commentaryCol: {
    flex: 1,
    gap: 16,
  },
  commentCard: {
    backgroundColor: S.canvasDarkCard,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  commentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: S.canvasDarkAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  commentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: S.textLight,
    marginBottom: 8,
  },
  commentDesc: {
    fontSize: 13,
    lineHeight: 22,
    color: S.textLightSecondary,
  },
});

/* ───────────────────────────────────────────────────────────────── */
/*  SECTION B: Understand Your Money (The 3-Pillar Ledger System)   */
/* ───────────────────────────────────────────────────────────────── */
function ThreePillarLedgerSection({
  isMobile,
  isTablet,
}: {
  isMobile: boolean;
  isTablet: boolean;
}) {
  const pillars = [
    {
      num: '01',
      title: 'Daily Spending Guardrail',
      subtitle: 'Dynamic day-by-day safety allowance',
      desc: 'Instead of an intimidating static monthly budget, SPR divides your remaining discretionary funds by remaining calendar days. Every morning you get one clean number you can safely spend.',
      icon: 'speedometer-outline',
      highlight: 'Auto-recalculates daily',
      color: S.piggyPink,
    },
    {
      num: '02',
      title: 'Essential vs. Discretionary',
      subtitle: 'Never cut transit to buy games',
      desc: 'Automatically sorts required fixed costs (canteen meals, bus fare, school supplies) from flexible lifestyle wants (boba, gaming, snacks), so you know which expenses can be paused.',
      icon: 'pie-chart-outline',
      highlight: 'Clear visual split',
      color: S.amberCoin,
    },
    {
      num: '03',
      title: 'Savings Vault Isolation',
      subtitle: 'Ring-fenced goal reserves',
      desc: 'Savings are isolated from your spendable cash balance. When you allocate ฿100 toward a school laptop, it disappears from your daily guardrail so you don’t accidentally spend it on snacks.',
      icon: 'lock-closed-outline',
      highlight: 'Protected from impulses',
      color: S.mintCash,
    },
  ];

  return (
    <View style={[pillarStyles.section, isMobile && pillarStyles.sectionMobile]}>
      <View style={pillarStyles.container}>
        <View style={pillarStyles.badgeWrap}>
          <Text style={pillarStyles.badgeText}>SECTION 02 · CORE CONCEPT</Text>
        </View>

        <Text style={[pillarStyles.heading, isMobile && { fontSize: 30, lineHeight: 38 }]}>
          The 3-Pillar Ledger System
        </Text>
        <Text style={pillarStyles.subhead}>
          Understand → Simulate → Plan → Save. A structured rhythm engineered around how students
          actually receive allowances and manage everyday expenses.
        </Text>

        <View style={[pillarStyles.cardsGrid, isMobile && pillarStyles.cardsGridMobile]}>
          {pillars.map((p) => (
            <View key={p.num} style={pillarStyles.pillarCard}>
              <View style={pillarStyles.pillarHeader}>
                <Text style={[pillarStyles.pillarNum, { color: p.color }]}>{p.num}</Text>
                <View style={[pillarStyles.iconFrame, { backgroundColor: p.color + '18' }]}>
                  <Ionicons name={p.icon as any} size={22} color={p.color} />
                </View>
              </View>

              <Text style={pillarStyles.pillarTitle}>{p.title}</Text>
              <Text style={pillarStyles.pillarSubtitle}>{p.subtitle}</Text>
              <Text style={pillarStyles.pillarDesc}>{p.desc}</Text>

              <View style={pillarStyles.highlightBadge}>
                <Ionicons name="checkmark-circle" size={14} color={p.color} />
                <Text style={[pillarStyles.highlightText, { color: p.color }]}>{p.highlight}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const pillarStyles = StyleSheet.create({
  section: {
    paddingVertical: 90,
    paddingHorizontal: '6%' as any,
    backgroundColor: S.canvasDark,
    alignItems: 'center',
  },
  sectionMobile: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  container: {
    maxWidth: 1200,
    width: '100%',
    alignItems: 'center',
  },
  badgeWrap: {
    backgroundColor: S.canvasDarkCard,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.amberCoin,
    letterSpacing: 1.5,
  },
  heading: {
    fontSize: 40,
    fontWeight: '900',
    color: S.textLight,
    textAlign: 'center',
    marginBottom: 14,
  },
  subhead: {
    fontSize: 16,
    lineHeight: 26,
    color: S.textLightSecondary,
    textAlign: 'center',
    maxWidth: 680,
    marginBottom: 48,
  },
  cardsGrid: {
    flexDirection: 'row',
    gap: 24,
    width: '100%',
  },
  cardsGridMobile: {
    flexDirection: 'column',
  },
  pillarCard: {
    flex: 1,
    backgroundColor: S.canvasDarkCard,
    borderRadius: 18,
    padding: 26,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  pillarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pillarNum: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  iconFrame: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: S.textLight,
    marginBottom: 6,
  },
  pillarSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: S.piggyPink,
    marginBottom: 14,
  },
  pillarDesc: {
    fontSize: 13,
    lineHeight: 22,
    color: S.textLightSecondary,
    marginBottom: 20,
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: S.canvasDarkBorder,
  },
  highlightText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

/* ───────────────────────────────────────────────────────────────── */
/*  SECTION 04 · COMPLETE STUDENT FINANCIAL ECOSYSTEM               */
/*  Four core mutual-aid & campus empowerment features               */
/* ───────────────────────────────────────────────────────────────── */
function StudioEcosystemSection({
  isMobile,
  isTablet,
  onNavigate,
}: {
  isMobile: boolean;
  isTablet: boolean;
  onNavigate: (route: string) => void;
}) {
  const ecosystemPillars = [
    {
      id: 'marketplace',
      route: '/marketplace',
      eyebrow: 'CAMPUS COMMERCE',
      badge: 'Zero Commissions',
      badgeColor: S.piggyPink,
      title: 'SPR Marketplace',
      desc: 'Buy and sell second-hand academic textbooks, scientific calculators, dorm electronics, and lab equipment directly with peers.',
      features: ['Search & category filters', 'In-person handover agreements', 'Verified safety & reporting'],
      icon: 'cart-outline',
      cta: 'Browse Marketplace',
    },
    {
      id: 'projects',
      route: '/projects',
      eyebrow: 'INNOVATION & STEM',
      badge: 'Step-by-Step Guides',
      badgeColor: '#8B5CF6',
      title: 'SPR Projects',
      desc: 'Discover vetted project roadmaps in tech, robotics, sustainability, and creative arts with realistic bills of materials and budgets.',
      features: ['Beginner to advanced roadmaps', 'Material cost calculators', 'AI project mentor assistance'],
      icon: 'bulb-outline',
      cta: 'Explore Projects',
    },
    {
      id: 'tryland',
      route: '/tryland',
      eyebrow: 'STUDENT BILL SPONSORSHIP',
      badge: 'PromptPay QR',
      badgeColor: '#10B981',
      title: '👑 RK (Rich Kid)',
      isTrylandWordmark: true,
      desc: 'Where students upload their bills and Rich Kids can pay them! A transparent safety net connecting verified student academic bills with generous supporters.',
      features: ['Students upload bills for review', 'Static PromptPay QR (฿ THB)', 'Admin manual verification against bank records'],
      icon: 'card-outline',
      cta: 'Sponsor a Student Bill',
    },
    {
      id: 'donate',
      route: '/donate',
      eyebrow: 'COMMUNITY CAMPAIGNS',
      badge: 'Admin-Curated',
      badgeColor: S.amberCoin,
      title: 'SPR Donate',
      desc: 'Official school-managed fundraising campaigns for student welfare, campus equipment, and emergency aid — verified by administrators with real-time PromptPay donation tracking.',
      features: ['School admin-only campaigns', 'Real-time database tally', 'Complete donor transparency'],
      icon: 'heart-outline',
      cta: 'Support a Campaign',
    },
  ];

  return (
    <View style={[ecoStyles.section, isMobile && ecoStyles.sectionMobile]}>
      <View style={ecoStyles.container}>
        <View style={ecoStyles.badgeWrap}>
          <Text style={ecoStyles.badgeText}>SECTION 04 · STUDENT PECUNIARY ECOSYSTEM</Text>
        </View>

        <Text style={[ecoStyles.heading, isMobile && { fontSize: 28, lineHeight: 36 }]}>
          Beyond Budgeting: A Full Student Mutual-Aid Economy
        </Text>
        <Text style={ecoStyles.subhead}>
          SPR bridges individual allowance discipline with real peer-to-peer campus commerce,
          computational project guides, and transparent mutual financial assistance.
        </Text>

        <View style={[ecoStyles.grid, isMobile && ecoStyles.gridMobile]}>
          {ecosystemPillars.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[ecoStyles.card, { borderColor: S.canvasDarkBorder }]}
              onPress={() => onNavigate(p.route)}
              activeOpacity={0.85}
            >
              <View style={ecoStyles.cardTopRow}>
                <View style={[ecoStyles.iconWrap, { backgroundColor: p.badgeColor + '18' }]}>
                  {p.isTrylandWordmark ? (
                    <Text style={{ fontSize: 20 }}>👑</Text>
                  ) : (
                    <Ionicons name={p.icon as any} size={22} color={p.badgeColor} />
                  )}
                </View>

                <View style={[ecoStyles.pillBadge, { backgroundColor: p.badgeColor + '18', borderColor: p.badgeColor + '40' }]}>
                  <Text style={[ecoStyles.pillText, { color: p.badgeColor }]}>{p.badge}</Text>
                </View>
              </View>

              <Text style={ecoStyles.eyebrow}>{p.eyebrow}</Text>

              {p.isTrylandWordmark ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 }}>
                  <Text style={{ fontSize: 20 }}>👑</Text>
                  <Text style={[ecoStyles.cardTitle, { color: S.textLight, letterSpacing: 1 }]}>RK</Text>
                  <View style={{ backgroundColor: '#F59E0B22', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 2 }}>
                    <Text style={{ color: '#D97706', fontSize: 10, fontWeight: '700' }}>RICH KID</Text>
                  </View>
                </View>
              ) : (
                <Text style={ecoStyles.cardTitle}>{p.title}</Text>
              )}

              <Text style={ecoStyles.cardDesc}>{p.desc}</Text>

              <View style={ecoStyles.featureList}>
                {p.features.map((feat, idx) => (
                  <View key={idx} style={ecoStyles.featureItem}>
                    <Ionicons name="checkmark-circle" size={14} color={p.badgeColor} />
                    <Text style={ecoStyles.featureText}>{feat}</Text>
                  </View>
                ))}
              </View>

              <View style={[ecoStyles.ctaRow, { borderTopColor: S.canvasDarkBorder }]}>
                <Text style={[ecoStyles.ctaText, { color: p.badgeColor }]}>{p.cta}</Text>
                <Ionicons name="arrow-forward" size={14} color={p.badgeColor} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const ecoStyles = StyleSheet.create({
  section: {
    paddingVertical: 90,
    paddingHorizontal: '6%' as any,
    backgroundColor: S.canvasDarkAlt,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: S.canvasDarkBorder,
  },
  sectionMobile: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  container: {
    maxWidth: 1200,
    width: '100%',
    alignItems: 'center',
  },
  badgeWrap: {
    backgroundColor: S.canvasDarkCard,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.mintCash,
    letterSpacing: 1.5,
  },
  heading: {
    fontSize: 38,
    fontWeight: '900',
    color: S.textLight,
    textAlign: 'center',
    marginBottom: 14,
  },
  subhead: {
    fontSize: 16,
    lineHeight: 26,
    color: S.textLightSecondary,
    textAlign: 'center',
    maxWidth: 720,
    marginBottom: 48,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    width: '100%',
  },
  gridMobile: {
    flexDirection: 'column',
  },
  card: {
    flex: 1,
    minWidth: 260,
    backgroundColor: S.canvasDarkCard,
    borderRadius: 16,
    padding: 26,
    borderWidth: 1,
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? {
      transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
    } as any : {}),
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: S.textLightMuted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: S.textLight,
    marginBottom: 10,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 21,
    color: S.textLightSecondary,
    marginBottom: 16,
  },
  featureList: {
    gap: 8,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: S.textLightSecondary,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

/* ───────────────────────────────────────────────────────────────── */
/*  SECTION C: The Interactive Spending Simulator                   */
/* ───────────────────────────────────────────────────────────────── */
function InteractiveSpendingSimulatorSection({
  isMobile,
  isTablet,
}: {
  isMobile: boolean;
  isTablet: boolean;
}) {
  const [amount, setAmount] = useState<number>(65);
  const [purchaseName, setPurchaseName] = useState<string>('02 · Afternoon Tea');
  const [isDailyHabit, setIsDailyHabit] = useState<boolean>(false);

  const presets = [
    { name: '01 · Cafe Espresso', amt: 30, icon: 'cafe-outline' },
    { name: '02 · Afternoon Tea', amt: 65, icon: 'cup-outline' },
    { name: '03 · Campus Meal', amt: 140, icon: 'restaurant-outline' },
    { name: '04 · Cinema Pass', amt: 260, icon: 'film-outline' },
    { name: '05 · Tech Hardware', amt: 1100, icon: 'hardware-chip-outline' },
  ];

  // Mathematical simulation variables (Illustrative student figures)
  const baseDailyAllowance = 180;
  const targetGoalAmount = 20000;
  const currentGoalSaved = 5000;
  const baseMonthlySavingsRate = 1200; // ~฿40/day saved toward goal

  const dailyAllowanceAfter = baseDailyAllowance - amount;
  const recurringMonthlyCost = isDailyHabit ? amount * 20 : amount; // 20 school days
  const goalDelayDays = Math.ceil((recurringMonthlyCost / (baseMonthlySavingsRate / 30)));

  // Safety level classification
  const isSafe = dailyAllowanceAfter >= 50;
  const isCaution = dailyAllowanceAfter >= 0 && dailyAllowanceAfter < 50;
  const isDanger = dailyAllowanceAfter < 0;

  return (
    <View style={[simStyles.section, isMobile && simStyles.sectionMobile]}>
      <View style={simStyles.container}>
        <View style={simStyles.badgeWrap}>
          <Text style={simStyles.badgeText}>SECTION 03 · SIGNATURE FEATURE</Text>
        </View>

        <Text style={[simStyles.heading, isMobile && { fontSize: 30, lineHeight: 38 }]}>
          Simulate Before You Spend
        </Text>
        <Text style={simStyles.subhead}>
          Test purchases in this interactive studio demo. See how an illustrative purchase shifts
          today's daily guardrail and delays your active savings goals in real time.
        </Text>

        <View style={[simStyles.studioWorkspace, isMobile && simStyles.studioWorkspaceMobile]}>
          {/* Controls Panel */}
          <View style={simStyles.controlsCol}>
            <Text style={simStyles.colHeader}>1. SELECT OR TWEAK SAMPLE PURCHASE</Text>

            {/* Presets Grid */}
            <View style={simStyles.presetGrid}>
              {presets.map((p) => (
                <TouchableOpacity
                  key={p.name}
                  onPress={() => {
                    setAmount(p.amt);
                    setPurchaseName(p.name);
                  }}
                  style={[
                    simStyles.presetBtn,
                    amount === p.amt && simStyles.presetBtnActive,
                  ]}
                >
                  <Ionicons
                    name={p.icon as any}
                    size={16}
                    color={amount === p.amt ? S.piggyPink : S.textLightSecondary}
                  />
                  <Text
                    style={[
                      simStyles.presetBtnText,
                      amount === p.amt && simStyles.presetBtnTextActive,
                    ]}
                  >
                    {p.name} (฿{p.amt})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Stepper Slider */}
            <View style={simStyles.stepperBox}>
              <View style={simStyles.stepperHeader}>
                <Text style={simStyles.stepperLabel}>Adjust Amount:</Text>
                <Text style={simStyles.stepperValue}>฿{amount}</Text>
              </View>

              <View style={simStyles.btnRow}>
                <TouchableOpacity
                  onPress={() => setAmount(Math.max(10, amount - 15))}
                  style={simStyles.adjustBtn}
                >
                  <Text style={simStyles.adjustBtnText}>- ฿15</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAmount(Math.max(10, amount - 50))}
                  style={simStyles.adjustBtn}
                >
                  <Text style={simStyles.adjustBtnText}>- ฿50</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAmount(amount + 50)}
                  style={simStyles.adjustBtn}
                >
                  <Text style={simStyles.adjustBtnText}>+ ฿50</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAmount(amount + 200)}
                  style={simStyles.adjustBtn}
                >
                  <Text style={simStyles.adjustBtnText}>+ ฿200</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Habit Mode Toggle */}
            <TouchableOpacity
              onPress={() => setIsDailyHabit(!isDailyHabit)}
              style={[
                simStyles.habitToggle,
                isDailyHabit && simStyles.habitToggleActive,
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isDailyHabit ? 'checkbox' : 'square-outline'}
                size={20}
                color={isDailyHabit ? S.piggyPink : S.textLightMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={simStyles.habitTitle}>Repeat as Daily School Habit?</Text>
                <Text style={simStyles.habitSub}>
                  Simulates buying this every weekday (20 days/month = ฿{amount * 20}/mo)
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Real-time Reactive Results Ledger */}
          <View style={simStyles.resultsCol}>
            <Text style={simStyles.colHeader}>2. INSTANT LEDGER IMPACT SIMULATION</Text>

            {/* Status Stamp Banner */}
            <View
              style={[
                simStyles.statusBanner,
                isSafe && { backgroundColor: S.mintCashBg, borderColor: S.mintCash },
                isCaution && { backgroundColor: S.amberCoinGlow, borderColor: S.amberCoin },
                isDanger && { backgroundColor: S.coralWarningBg, borderColor: S.coralWarning },
              ]}
            >
              <Ionicons
                name={
                  isSafe
                    ? 'checkmark-circle'
                    : isCaution
                    ? 'alert-circle'
                    : 'warning'
                }
                size={22}
                color={isSafe ? S.mintCash : isCaution ? S.amberCoin : S.coralWarning}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    simStyles.statusTitle,
                    {
                      color: isSafe
                        ? S.mintCash
                        : isCaution
                        ? S.amberCoin
                        : S.coralWarning,
                    },
                  ]}
                >
                  {isSafe
                    ? 'SAFE ZONE · FITS DAILY BUDGET'
                    : isCaution
                    ? 'CAUTION · TIGHTENS NEXT 3 DAYS'
                    : 'BUDGET BREAKER · EXCEEDS DAILY BUFFER'}
                </Text>
                <Text style={simStyles.statusNote}>
                  {isSafe
                    ? `Buying "${purchaseName}" (฿${amount}) leaves ฿${dailyAllowanceAfter} in your daily guardrail.`
                    : isCaution
                    ? `Buying "${purchaseName}" leaves only ฿${dailyAllowanceAfter} left today. Canteen lunch will be tight.`
                    : `Buying "${purchaseName}" exceeds today's limit by ฿${Math.abs(
                        dailyAllowanceAfter
                      )}. Will borrow from savings.`}
                </Text>
              </View>
            </View>

            {/* Calculations Breakdown */}
            <View style={simStyles.calcBox}>
              <View style={simStyles.calcRow}>
                <Text style={simStyles.calcLabel}>Sample Daily Guardrail (Before):</Text>
                <Text style={simStyles.calcVal}>฿{baseDailyAllowance}.00</Text>
              </View>
              <View style={simStyles.calcRow}>
                <Text style={simStyles.calcLabel}>Proposed Purchase ({purchaseName}):</Text>
                <Text style={[simStyles.calcVal, { color: S.coralWarning }]}>-฿{amount}.00</Text>
              </View>
              <View style={[simStyles.calcRow, simStyles.calcRowTotal]}>
                <Text style={simStyles.calcLabelBold}>Daily Guardrail Remaining (After):</Text>
                <Text
                  style={[
                    simStyles.calcValBold,
                    { color: isDanger ? S.coralWarning : isCaution ? S.amberCoin : S.mintCash },
                  ]}
                >
                  {dailyAllowanceAfter >= 0 ? `+฿${dailyAllowanceAfter}.00` : `-฿${Math.abs(dailyAllowanceAfter)}.00`}
                </Text>
              </View>
            </View>

            {/* Goal Impact Visual */}
            <View style={simStyles.goalImpactBox}>
              <View style={simStyles.goalImpactHeader}>
                <Ionicons name="flag-outline" size={18} color={S.amberCoin} />
                <Text style={simStyles.goalImpactTitle}>Impact on: Coding Laptop (฿20,000)</Text>
              </View>
              <Text style={simStyles.goalImpactDesc}>
                {goalDelayDays <= 0
                  ? 'No delay on your goal target date. Your regular weekly savings remain intact.'
                  : `This purchase pushes your laptop completion date back by approx. +${goalDelayDays} days.`}
              </Text>
              <View style={simStyles.delayPill}>
                <Text style={simStyles.delayPillText}>
                  {goalDelayDays <= 0 ? 'GOAL ON SCHEDULE' : `+${goalDelayDays} DAYS ESTIMATED DELAY`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const simStyles = StyleSheet.create({
  section: {
    paddingVertical: 90,
    paddingHorizontal: '6%' as any,
    backgroundColor: S.canvasDarkAlt,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: S.canvasDarkBorder,
  },
  sectionMobile: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  container: {
    maxWidth: 1200,
    width: '100%',
    alignItems: 'center',
  },
  badgeWrap: {
    backgroundColor: S.piggyPinkSubtle,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.piggyPink,
    letterSpacing: 1.5,
  },
  heading: {
    fontSize: 40,
    fontWeight: '900',
    color: S.textLight,
    textAlign: 'center',
    marginBottom: 14,
  },
  subhead: {
    fontSize: 16,
    lineHeight: 26,
    color: S.textLightSecondary,
    textAlign: 'center',
    maxWidth: 680,
    marginBottom: 44,
  },
  studioWorkspace: {
    flexDirection: 'row',
    gap: 32,
    width: '100%',
  },
  studioWorkspaceMobile: {
    flexDirection: 'column',
  },
  controlsCol: {
    flex: 1,
    backgroundColor: S.canvasDarkCard,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    gap: 20,
  },
  resultsCol: {
    flex: 1.1,
    backgroundColor: S.canvasDarkCard,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    gap: 16,
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: S.textLightMuted,
    letterSpacing: 1,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: S.canvasDarkAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  presetBtnActive: {
    backgroundColor: S.piggyPinkSubtle,
    borderColor: S.piggyPink,
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: S.textLightSecondary,
  },
  presetBtnTextActive: {
    color: S.piggyPink,
    fontWeight: '800',
  },
  stepperBox: {
    backgroundColor: S.canvasDarkAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: S.textLight,
  },
  stepperValue: {
    fontSize: 22,
    fontWeight: '900',
    color: S.piggyPink,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adjustBtn: {
    flex: 1,
    backgroundColor: S.canvasDarkCard,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  adjustBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: S.textLightSecondary,
  },
  habitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: S.canvasDarkAlt,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  habitToggleActive: {
    borderColor: S.piggyPink,
    backgroundColor: S.piggyPinkSubtle,
  },
  habitTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: S.textLight,
  },
  habitSub: {
    fontSize: 11,
    color: S.textLightSecondary,
    marginTop: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  statusNote: {
    fontSize: 12,
    lineHeight: 18,
    color: S.textLightSecondary,
  },
  calcBox: {
    backgroundColor: S.canvasDarkAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    gap: 8,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calcRowTotal: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: S.canvasDarkBorder,
    marginTop: 4,
  },
  calcLabel: {
    fontSize: 13,
    color: S.textLightSecondary,
  },
  calcVal: {
    fontSize: 13,
    fontWeight: '700',
    color: S.textLight,
  },
  calcLabelBold: {
    fontSize: 13,
    fontWeight: '800',
    color: S.textLight,
  },
  calcValBold: {
    fontSize: 15,
    fontWeight: '900',
  },
  goalImpactBox: {
    backgroundColor: S.canvasDarkAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  goalImpactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  goalImpactTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: S.textLight,
  },
  goalImpactDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: S.textLightSecondary,
    marginBottom: 10,
  },
  delayPill: {
    backgroundColor: S.canvasDarkCard,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  delayPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.amberCoin,
    letterSpacing: 0.5,
  },
});

/* ───────────────────────────────────────────────────────────────── */
/*  SECTION D: Plan & Save (The Piggy Vault)                        */
/* ───────────────────────────────────────────────────────────────── */
function PiggyVaultSection({
  isMobile,
  isTablet,
}: {
  isMobile: boolean;
  isTablet: boolean;
}) {
  return (
    <View style={[vaultStyles.section, isMobile && vaultStyles.sectionMobile]}>
      <View style={vaultStyles.container}>
        <View style={vaultStyles.badgeWrap}>
          <Text style={vaultStyles.badgeText}>SECTION 04 · SAVINGS VAULT</Text>
        </View>

        <Text style={[vaultStyles.heading, isMobile && { fontSize: 30, lineHeight: 38 }]}>
          Small Drops Fill the Piggy Bank
        </Text>
        <Text style={vaultStyles.subhead}>
          Saving isn’t about sacrificing your student life. It’s about setting purposeful targets,
          automating micro-allocations, and watching compounding turn spare bahts into big milestones.
        </Text>

        <View style={[vaultStyles.grid, isMobile && vaultStyles.gridMobile]}>
          {/* Card 1: Micro-Savings Compounding Ledger */}
          <View style={vaultStyles.vaultCard}>
            <View style={vaultStyles.cardTop}>
              <Ionicons name="trending-up-outline" size={20} color={S.amberCoin} />
              <Text style={vaultStyles.cardBadge}>COMPOUNDING TABLE</Text>
            </View>
            <Text style={vaultStyles.cardTitle}>Daily ฿30 Coffee Rule</Text>
            <Text style={vaultStyles.cardDesc}>
              Skipping just one ฿30 drink every school day deposits surprising totals:
            </Text>

            <View style={vaultStyles.tableRows}>
              <View style={vaultStyles.tableRow}>
                <Text style={vaultStyles.tableKey}>In 1 Month (20 school days)</Text>
                <Text style={vaultStyles.tableVal}>฿600.00</Text>
              </View>
              <View style={vaultStyles.tableRow}>
                <Text style={vaultStyles.tableKey}>In 1 Semester (5 months)</Text>
                <Text style={vaultStyles.tableVal}>฿3,000.00</Text>
              </View>
              <View style={[vaultStyles.tableRow, { borderBottomWidth: 0 }]}>
                <Text style={[vaultStyles.tableKey, { fontWeight: '800', color: S.textLight }]}>
                  In 1 Academic Year (10 mos)
                </Text>
                <Text style={[vaultStyles.tableVal, { color: S.mintCash, fontSize: 16 }]}>
                  ฿6,000.00
                </Text>
              </View>
            </View>
          </View>

          {/* Card 2: Interactive Goal Mockup */}
          <View style={[vaultStyles.vaultCard, { flex: 1.15 }]}>
            <View style={vaultStyles.cardTop}>
              <Ionicons name="trophy-outline" size={22} color={S.piggyPink} />
              <Text style={vaultStyles.cardBadge}>STUDENT GOAL CASE STUDY</Text>
            </View>
            <Text style={vaultStyles.cardTitle}>Science Fair Project Budget</Text>
            <Text style={vaultStyles.cardDesc}>
              Real example from Saipanyarangsit MEP students funding materials:
            </Text>

            <View style={vaultStyles.goalBox}>
              <View style={vaultStyles.goalTopRow}>
                <Text style={vaultStyles.goalName}>Sensor Board & Robot Chassis</Text>
                <Text style={vaultStyles.goalTarget}>Target: ฿3,500</Text>
              </View>

              <View style={vaultStyles.progressTrack}>
                <View style={[vaultStyles.progressFill, { width: '68%' }]} />
              </View>

              <View style={vaultStyles.goalMetaRow}>
                <Text style={vaultStyles.metaLeft}>Saved: ฿2,380 (68%)</Text>
                <Text style={vaultStyles.metaRight}>Remaining: ฿1,120</Text>
              </View>

              <View style={vaultStyles.milestoneRow}>
                <View style={vaultStyles.milestoneTag}>
                  <Text style={vaultStyles.milestoneText}>✓ 25% Board Ordered</Text>
                </View>
                <View style={vaultStyles.milestoneTag}>
                  <Text style={vaultStyles.milestoneText}>✓ 50% Motors Acquired</Text>
                </View>
                <View style={[vaultStyles.milestoneTag, { backgroundColor: S.piggyPinkSubtle }]}>
                  <Text style={[vaultStyles.milestoneText, { color: S.piggyPink }]}>⏳ 75% Next Week</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const vaultStyles = StyleSheet.create({
  section: {
    paddingVertical: 90,
    paddingHorizontal: '6%' as any,
    backgroundColor: S.canvasDark,
    alignItems: 'center',
  },
  sectionMobile: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  container: {
    maxWidth: 1200,
    width: '100%',
    alignItems: 'center',
  },
  badgeWrap: {
    backgroundColor: S.canvasDarkCard,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.mintCash,
    letterSpacing: 1.5,
  },
  heading: {
    fontSize: 40,
    fontWeight: '900',
    color: S.textLight,
    textAlign: 'center',
    marginBottom: 14,
  },
  subhead: {
    fontSize: 16,
    lineHeight: 26,
    color: S.textLightSecondary,
    textAlign: 'center',
    maxWidth: 680,
    marginBottom: 48,
  },
  grid: {
    flexDirection: 'row',
    gap: 24,
    width: '100%',
  },
  gridMobile: {
    flexDirection: 'column',
  },
  vaultCard: {
    flex: 1,
    backgroundColor: S.canvasDarkCard,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: S.textLightMuted,
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: S.textLight,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: S.textLightSecondary,
    marginBottom: 16,
  },
  tableRows: {
    backgroundColor: S.canvasDarkAlt,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: S.canvasDarkBorder,
  },
  tableKey: {
    fontSize: 12,
    color: S.textLightSecondary,
  },
  tableVal: {
    fontSize: 13,
    fontWeight: '800',
    color: S.textLight,
  },
  goalBox: {
    backgroundColor: S.canvasDarkAlt,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  goalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goalName: {
    fontSize: 14,
    fontWeight: '800',
    color: S.textLight,
  },
  goalTarget: {
    fontSize: 13,
    fontWeight: '700',
    color: S.amberCoin,
  },
  progressTrack: {
    height: 8,
    backgroundColor: S.canvasDarkCard,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: S.piggyPink,
    borderRadius: 4,
  },
  goalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metaLeft: {
    fontSize: 11,
    color: S.piggyPink,
    fontWeight: '700',
  },
  metaRight: {
    fontSize: 11,
    color: S.textLightMuted,
  },
  milestoneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  milestoneTag: {
    backgroundColor: S.canvasDarkCard,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  milestoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: S.textLightSecondary,
  },
});

/* ───────────────────────────────────────────────────────────────── */
/*  SECTION E: Menu Scanner & AI Financial Assistant                */
/* ───────────────────────────────────────────────────────────────── */
function AIVisionSection({
  isMobile,
  isTablet,
}: {
  isMobile: boolean;
  isTablet: boolean;
}) {
  return (
    <View style={[aiStyles.section, isMobile && aiStyles.sectionMobile]}>
      <View style={aiStyles.container}>
        <View style={aiStyles.badgeWrap}>
          <Text style={aiStyles.badgeText}>SECTION 05 · SMART TOOLS</Text>
        </View>

        <Text style={[aiStyles.heading, isMobile && { fontSize: 30, lineHeight: 38 }]}>
          Menu Scanner & AI Financial Guide
        </Text>
        <Text style={aiStyles.subhead}>
          Practical intelligence grounded in real daily student needs. Snap a menu at a noodle
          shop to find value combos, or ask your assistant whether Friday dinner fits your goals.
        </Text>

        <View style={[aiStyles.dualGrid, isMobile && aiStyles.dualGridMobile]}>
          {/* Tool 1: Menu Scanner (OCR) */}
          <View style={aiStyles.toolCard}>
            <View style={aiStyles.toolHeader}>
              <View style={aiStyles.toolIconBox}>
                <Ionicons name="camera-outline" size={22} color={S.piggyPink} />
              </View>
              <View>
                <Text style={aiStyles.toolTitle}>Camera Menu Scanner</Text>
                <Text style={aiStyles.toolTag}>Powered by Gemini Vision OCR</Text>
              </View>
            </View>

            <Text style={aiStyles.toolDesc}>
              Snap a physical menu at the food court. SPR automatically detects dishes and prices,
              then filters recommendations that fit your remaining daily budget without guessing.
            </Text>

            {/* Menu OCR Mockup */}
            <View style={aiStyles.menuMock}>
              <View style={aiStyles.menuHeader}>
                <Ionicons name="restaurant" size={14} color={S.textLightMuted} />
                <Text style={aiStyles.menuName}>P’Som Canteen Noodles</Text>
                <Text style={aiStyles.detectedBadge}>3 ITEMS DETECTED</Text>
              </View>

              <View style={aiStyles.menuItems}>
                <View style={aiStyles.menuRow}>
                  <Text style={aiStyles.dishName}>Chicken Noodle Soup</Text>
                  <Text style={aiStyles.dishPrice}>฿50.00</Text>
                </View>
                <View style={[aiStyles.menuRow, { backgroundColor: S.mintCashBg }]}>
                  <View>
                    <Text style={[aiStyles.dishName, { color: S.mintCash, fontWeight: '800' }]}>
                      ★ Pork Rice Set + Drink (Best Value)
                    </Text>
                    <Text style={{ fontSize: 10, color: S.mintCash }}>Fits inside remaining ฿75 buffer</Text>
                  </View>
                  <Text style={[aiStyles.dishPrice, { color: S.mintCash, fontWeight: '800' }]}>฿65.00</Text>
                </View>
                <View style={aiStyles.menuRow}>
                  <Text style={aiStyles.dishName}>Seafood Tom Yum Special</Text>
                  <Text style={aiStyles.dishPrice}>฿95.00</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Tool 2: AI Financial Assistant */}
          <View style={aiStyles.toolCard}>
            <View style={aiStyles.toolHeader}>
              <View style={[aiStyles.toolIconBox, { backgroundColor: S.amberCoinGlow }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={S.amberCoin} />
              </View>
              <View>
                <Text style={aiStyles.toolTitle}>AI Financial Guide</Text>
                <Text style={aiStyles.toolTag}>Conversational Budget Advisor</Text>
              </View>
            </View>

            <Text style={aiStyles.toolDesc}>
              Directly unified with your savings goals: each goal automatically launches its own
              dedicated AI advisory thread. Ask questions like "Can I afford weekend cinema?" and
              receive live, context-aware answers calculated against your real allowances.
            </Text>

            {/* Chat Dialog Mockup */}
            <View style={aiStyles.chatMock}>
              <View style={aiStyles.userBubble}>
                <Text style={aiStyles.userMsg}>
                  "I want to buy ฿240 cinema ticket tomorrow. Will it hurt my laptop goal?"
                </Text>
              </View>
              <View style={aiStyles.aiBubble}>
                <View style={aiStyles.aiPill}>
                  <Ionicons name="pulse" size={12} color={S.piggyPink} />
                  <Text style={aiStyles.aiPillText}>SPR Financial Guide</Text>
                </View>
                <Text style={aiStyles.aiMsg}>
                  "You have ฿310 remaining in this week’s discretionary buffer. The ฿240 ticket fits,
                  leaving ฿70 for Sunday transit. Your ฿250 weekly laptop goal remains completely safe!"
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const aiStyles = StyleSheet.create({
  section: {
    paddingVertical: 90,
    paddingHorizontal: '6%' as any,
    backgroundColor: S.canvasDarkAlt,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: S.canvasDarkBorder,
  },
  sectionMobile: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  container: {
    maxWidth: 1200,
    width: '100%',
    alignItems: 'center',
  },
  badgeWrap: {
    backgroundColor: S.canvasDarkCard,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.piggyPink,
    letterSpacing: 1.5,
  },
  heading: {
    fontSize: 40,
    fontWeight: '900',
    color: S.textLight,
    textAlign: 'center',
    marginBottom: 14,
  },
  subhead: {
    fontSize: 16,
    lineHeight: 26,
    color: S.textLightSecondary,
    textAlign: 'center',
    maxWidth: 680,
    marginBottom: 48,
  },
  dualGrid: {
    flexDirection: 'row',
    gap: 28,
    width: '100%',
  },
  dualGridMobile: {
    flexDirection: 'column',
  },
  toolCard: {
    flex: 1,
    backgroundColor: S.canvasDarkCard,
    borderRadius: 18,
    padding: 26,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  toolIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: S.piggyPinkSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: S.textLight,
  },
  toolTag: {
    fontSize: 11,
    fontWeight: '700',
    color: S.textLightMuted,
    marginTop: 2,
  },
  toolDesc: {
    fontSize: 13,
    lineHeight: 22,
    color: S.textLightSecondary,
    marginBottom: 20,
  },
  menuMock: {
    backgroundColor: S.canvasDarkAlt,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: S.canvasDarkBorder,
    marginBottom: 10,
  },
  menuName: {
    fontSize: 12,
    fontWeight: '700',
    color: S.textLight,
    flex: 1,
  },
  detectedBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: S.piggyPink,
    backgroundColor: S.piggyPinkSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  menuItems: {
    gap: 8,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
  },
  dishName: {
    fontSize: 12,
    color: S.textLight,
  },
  dishPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: S.textLight,
  },
  chatMock: {
    backgroundColor: S.canvasDarkAlt,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    gap: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: S.piggyPink,
    padding: 12,
    borderRadius: 12,
    borderBottomRightRadius: 2,
    maxWidth: '85%',
  },
  userMsg: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    lineHeight: 18,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: S.canvasDarkCard,
    padding: 12,
    borderRadius: 12,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    maxWidth: '92%',
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  aiPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: S.piggyPink,
  },
  aiMsg: {
    fontSize: 12,
    lineHeight: 18,
    color: S.textLightSecondary,
  },
});

/* ───────────────────────────────────────────────────────────────── */
/*  SECTION F: Survey Research                                      */
/* ───────────────────────────────────────────────────────────────── */
function StudioResearchSection({
  isMobile,
  isTablet,
}: {
  isMobile: boolean;
  isTablet: boolean;
}) {
  return (
    <View style={[resStyles.section, isMobile && resStyles.sectionMobile]}>
      <View style={resStyles.container}>
        <View style={resStyles.badgeWrap}>
          <Text style={resStyles.badgeText}>SECTION 06 · PROJECT RESEARCH</Text>
        </View>

        <Text style={[resStyles.heading, isMobile && { fontSize: 30, lineHeight: 38 }]}>
          Backed by Real Student Evidence
        </Text>
        <Text style={resStyles.subhead}>
          Our team surveyed 73 students aged 14–21 across Saipanyarangsit School’s Mini English
          Program (MEP) to understand real pecuniary habits and obstacles.
        </Text>

        {/* 3 Core Survey Stats */}
        <View style={[resStyles.statCards, isMobile && resStyles.statCardsMobile]}>
          <View style={resStyles.statCard}>
            <Text style={resStyles.statNum}>73</Text>
            <Text style={resStyles.statLabel}>Respondents Surveyed</Text>
            <Text style={resStyles.statSub}>Classmates & peers aged 14–21 in school</Text>
          </View>

          <View style={[resStyles.statCard, { borderColor: S.piggyPink }]}>
            <Text style={[resStyles.statNum, { color: S.piggyPink }]}>54.8%</Text>
            <Text style={resStyles.statLabel}>Reported Bad Financial Habits</Text>
            <Text style={resStyles.statSub}>40 of 73 students cited untracked snacking & impulse buys</Text>
          </View>

          <View style={resStyles.statCard}>
            <Text style={[resStyles.statNum, { color: S.amberCoin }]}>#1</Text>
            <Text style={resStyles.statLabel}>Food & Daily Canteen Spend</Text>
            <Text style={resStyles.statSub}>Primary category where students exceed allowances</Text>
          </View>
        </View>

        {/* Embedded Survey Distribution Breakdown */}
        <View style={resStyles.embeddedSurveyWrap}>
          <SurveyResults />
        </View>
      </View>
    </View>
  );
}

const resStyles = StyleSheet.create({
  section: {
    paddingVertical: 90,
    paddingHorizontal: '6%' as any,
    backgroundColor: S.canvasDark,
    alignItems: 'center',
  },
  sectionMobile: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  container: {
    maxWidth: 1200,
    width: '100%',
    alignItems: 'center',
  },
  badgeWrap: {
    backgroundColor: S.canvasDarkCard,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.amberCoin,
    letterSpacing: 1.5,
  },
  heading: {
    fontSize: 40,
    fontWeight: '900',
    color: S.textLight,
    textAlign: 'center',
    marginBottom: 14,
  },
  subhead: {
    fontSize: 16,
    lineHeight: 26,
    color: S.textLightSecondary,
    textAlign: 'center',
    maxWidth: 680,
    marginBottom: 44,
  },
  statCards: {
    flexDirection: 'row',
    gap: 20,
    width: '100%',
    marginBottom: 48,
  },
  statCardsMobile: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    backgroundColor: S.canvasDarkCard,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 46,
    fontWeight: '900',
    color: S.textLight,
    letterSpacing: -1,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: S.textLight,
    textAlign: 'center',
    marginBottom: 4,
  },
  statSub: {
    fontSize: 12,
    color: S.textLightMuted,
    textAlign: 'center',
  },
  embeddedSurveyWrap: {
    width: '100%',
    backgroundColor: S.canvasDarkAlt,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
});

/* ───────────────────────────────────────────────────────────────── */
/*  SECTION G: Team and Project Advisor                             */
/* ───────────────────────────────────────────────────────────────── */
function StudioTeamSection({
  isMobile,
  isTablet,
}: {
  isMobile: boolean;
  isTablet: boolean;
}) {
  const members = [
    {
      name: 'Witchayaporn Boriraj',
      role: 'Presentation Slide Maker',
      img: require('../../assets/images/member1.jpg'),
    },
    {
      name: 'Pimnara Boonyawatputthi',
      role: 'Researcher',
      img: require('../../assets/images/member2.jpg'),
    },
    {
      name: 'Wachrawit Jindawong',
      role: 'Presentation Slide Maker',
      img: require('../../assets/images/member3.jpg'),
    },
    {
      name: 'Phanyawat Wanmarat',
      role: 'Programmer',
      img: require('../../assets/images/member4.png'),
    },
  ];

  return (
    <View style={[teamStyles.section, isMobile && teamStyles.sectionMobile]}>
      <View style={teamStyles.container}>
        <View style={teamStyles.badgeWrap}>
          <Text style={teamStyles.badgeText}>SECTION 07 · CREDITS</Text>
        </View>

        <Text style={[teamStyles.heading, isMobile && { fontSize: 30, lineHeight: 38 }]}>
          Meet Team Piggy Pockets
        </Text>
        <Text style={teamStyles.subhead}>
          Conceived, designed, and programmed by student creators from Saipanyarangsit School’s
          Mini English Program (MEP).
        </Text>

        {/* 4 Student Members */}
        <View style={[teamStyles.teamGrid, isMobile && teamStyles.teamGridMobile]}>
          {members.map((m, idx) => (
            <View key={idx} style={teamStyles.memberCard}>
              <View style={teamStyles.avatarRing}>
                <Image source={m.img} style={teamStyles.avatarImg} alt={`Photo of ${m.name}`} />
              </View>
              <Text style={teamStyles.memberName}>{m.name}</Text>
              <Text style={teamStyles.memberRole}>{m.role}</Text>
              <Text style={teamStyles.memberSchool}>Saipanyarangsit School · MEP</Text>
            </View>
          ))}
        </View>

        {/* Project Advisor Card with Anthony.jpg */}
        <View style={teamStyles.advisorWrap}>
          <View style={teamStyles.advisorCard}>
            <View style={teamStyles.advisorPhotoRing}>
              <Image
                source={ANTHONY_PHOTO}
                style={teamStyles.advisorPhoto}
                alt="Photo of Project Advisor Mr. Anthony Jose B. Ferrer"
              />
            </View>

            <View style={{ flex: 1, alignItems: isMobile ? 'center' : 'flex-start' }}>
              <View style={teamStyles.advisorBadgeWrap}>
                <Ionicons name="ribbon-outline" size={15} color={S.piggyPink} />
                <Text style={teamStyles.advisorBadgeText}>FACULTY ADVISOR</Text>
              </View>

              <Text style={teamStyles.advisorName}>Project Advisor: Mr. Anthony Jose B. Ferrer</Text>
              <Text style={teamStyles.advisorAffil}>Saipanyarangsit School · MEP Faculty</Text>
              <Text style={teamStyles.advisorDesc}>
                Providing instructional guidance, pedagogical oversight, and project direction for
                the Student Pecuniary Routine initiative.
              </Text>
            </View>
          </View>
        </View>

        {/* Saipanyarangsit School Institutional Affiliation */}
        <View style={teamStyles.schoolAffilWrap}>
          <View style={teamStyles.schoolAffilCard}>
            <View style={teamStyles.schoolLogoFrame}>
              <Image
                source={SCHOOL_LOGO}
                style={teamStyles.schoolLogoImg}
                alt="Official Seal of Saipanyarangsit School"
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1, alignItems: isMobile ? 'center' : 'flex-start' }}>
              <View style={teamStyles.schoolBadgeWrap}>
                <Ionicons name="school-outline" size={14} color={S.mintCash} />
                <Text style={teamStyles.schoolBadgeText}>INSTITUTIONAL AFFILIATION</Text>
              </View>
              <Text style={teamStyles.schoolTitle}>Saipanyarangsit School</Text>
              <Text style={teamStyles.schoolSub}>Mini English Program (MEP) · Student Initiative</Text>
              <Text style={teamStyles.schoolDesc}>
                Student Pecuniary Routine (SPR) was conceived, designed, and programmed within the Mini English Program (MEP) curriculum at Saipanyarangsit School. This project demonstrates academic excellence in mathematics, behavioral economics, and software engineering under faculty advisory.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const teamStyles = StyleSheet.create({
  section: {
    paddingVertical: 90,
    paddingHorizontal: '6%' as any,
    backgroundColor: S.canvasDarkAlt,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: S.canvasDarkBorder,
  },
  sectionMobile: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  container: {
    maxWidth: 1200,
    width: '100%',
    alignItems: 'center',
  },
  badgeWrap: {
    backgroundColor: S.piggyPinkSubtle,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.piggyPink,
    letterSpacing: 1.5,
  },
  heading: {
    fontSize: 40,
    fontWeight: '900',
    color: S.textLight,
    textAlign: 'center',
    marginBottom: 14,
  },
  subhead: {
    fontSize: 16,
    lineHeight: 26,
    color: S.textLightSecondary,
    textAlign: 'center',
    maxWidth: 680,
    marginBottom: 48,
  },
  teamGrid: {
    flexDirection: 'row',
    gap: 20,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 36,
  },
  teamGridMobile: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  memberCard: {
    backgroundColor: S.canvasDarkCard,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    width: 250,
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: S.piggyPink,
    marginBottom: 14,
    backgroundColor: '#000',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '800',
    color: S.textLight,
    textAlign: 'center',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '700',
    color: S.piggyPink,
    textAlign: 'center',
    marginBottom: 4,
  },
  memberSchool: {
    fontSize: 11,
    color: S.textLightMuted,
    textAlign: 'center',
  },
  advisorWrap: {
    maxWidth: 820,
    width: '100%',
  },
  advisorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    backgroundColor: S.canvasDarkCard,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: S.piggyPink,
    shadowColor: S.piggyPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  advisorPhotoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: S.piggyPink,
    backgroundColor: '#000',
  },
  advisorPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  advisorBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: S.piggyPinkSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 8,
  },
  advisorBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: S.piggyPink,
    letterSpacing: 1.2,
  },
  advisorName: {
    fontSize: 20,
    fontWeight: '900',
    color: S.textLight,
    marginBottom: 4,
  },
  advisorAffil: {
    fontSize: 13,
    fontWeight: '700',
    color: S.amberCoin,
    marginBottom: 8,
  },
  advisorDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: S.textLightSecondary,
  },
  schoolAffilWrap: {
    maxWidth: 820,
    width: '100%',
    marginTop: 20,
  },
  schoolAffilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    backgroundColor: S.canvasDarkCard,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  schoolLogoFrame: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schoolLogoImg: {
    width: '100%',
    height: '100%',
  },
  schoolBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: S.mintCashBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 6,
  },
  schoolBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: S.mintCash,
    letterSpacing: 1.2,
  },
  schoolTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: S.textLight,
    marginBottom: 2,
  },
  schoolSub: {
    fontSize: 12,
    fontWeight: '600',
    color: S.amberCoin,
    marginBottom: 6,
  },
  schoolDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: S.textLightSecondary,
  },
});

/* ───────────────────────────────────────────────────────────────── */
/*  SECTION H: Feedback Form                                        */
/* ───────────────────────────────────────────────────────────────── */
function StudioFeedbackSection({ isMobile }: { isMobile: boolean }) {
  const [type, setType] = useState('feature');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('Please provide feedback message.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${LOCAL_API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          contactEmail: email.trim() || undefined,
          platform: 'web-landing',
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setMessage('');
        setEmail('');
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to submit feedback.');
      }
    } catch {
      setError('Could not reach backend. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[feedStyles.section, isMobile && feedStyles.sectionMobile]}>
      <View style={feedStyles.container}>
        <View style={feedStyles.badgeWrap}>
          <Text style={feedStyles.badgeText}>SECTION 08 · STUDENT FEEDBACK</Text>
        </View>

        <Text style={[feedStyles.heading, isMobile && { fontSize: 28 }]}>Help Shape SPR Studio</Text>
        <Text style={feedStyles.subhead}>
          Found a bug? Have an idea for a canteen budget feature? Send direct notes to our
          programming team.
        </Text>

        <View style={feedStyles.formCard}>
          {success ? (
            <View style={feedStyles.successBox}>
              <Ionicons name="checkmark-circle" size={40} color={S.mintCash} />
              <Text style={feedStyles.successTitle}>Thank You!</Text>
              <Text style={feedStyles.successText}>
                Your feedback has been delivered to Team Piggy Pockets.
              </Text>
              <TouchableOpacity
                onPress={() => setSuccess(false)}
                style={feedStyles.anotherBtn}
              >
                <Text style={feedStyles.anotherBtnText}>Send Another Note</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={feedStyles.typeRow}>
                {[
                  { id: 'feature', label: 'Feature Idea' },
                  { id: 'bug', label: 'Report Bug' },
                  { id: 'general', label: 'General Thought' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setType(t.id)}
                    style={[
                      feedStyles.typeBtn,
                      type === t.id && feedStyles.typeBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        feedStyles.typeBtnText,
                        type === t.id && feedStyles.typeBtnTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={feedStyles.textArea}
                placeholder="What can we improve for students?"
                placeholderTextColor={S.textLightMuted}
                multiline
                numberOfLines={4}
                value={message}
                onChangeText={setMessage}
              />

              <TextInput
                style={feedStyles.input}
                placeholder="Your email (optional, for follow-up)"
                placeholderTextColor={S.textLightMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />

              {error ? <Text style={feedStyles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={feedStyles.submitBtn}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Text style={feedStyles.submitBtnText}>Submit Note</Text>
                    <Ionicons name="send" size={14} color="#FFF" />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const feedStyles = StyleSheet.create({
  section: {
    paddingVertical: 80,
    paddingHorizontal: '6%' as any,
    backgroundColor: S.canvasDark,
    alignItems: 'center',
  },
  sectionMobile: { paddingVertical: 50, paddingHorizontal: 20 },
  container: { maxWidth: 680, width: '100%', alignItems: 'center' },
  badgeWrap: {
    backgroundColor: S.canvasDarkCard,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: S.piggyPink, letterSpacing: 1.2 },
  heading: { fontSize: 34, fontWeight: '900', color: S.textLight, textAlign: 'center', marginBottom: 10 },
  subhead: { fontSize: 14, color: S.textLightSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  formCard: {
    width: '100%',
    backgroundColor: S.canvasDarkCard,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    gap: 14,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: S.canvasDarkAlt,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
  },
  typeBtnActive: { backgroundColor: S.piggyPinkSubtle, borderColor: S.piggyPink },
  typeBtnText: { fontSize: 12, fontWeight: '700', color: S.textLightSecondary },
  typeBtnTextActive: { color: S.piggyPink, fontWeight: '800' },
  textArea: {
    backgroundColor: S.canvasDarkAlt,
    borderRadius: 10,
    padding: 14,
    color: S.textLight,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  input: {
    backgroundColor: S.canvasDarkAlt,
    borderRadius: 10,
    padding: 12,
    color: S.textLight,
    borderWidth: 1,
    borderColor: S.canvasDarkBorder,
    fontSize: 13,
  },
  errorText: { fontSize: 12, color: S.coralWarning, textAlign: 'center' },
  submitBtn: {
    backgroundColor: S.piggyPink,
    paddingVertical: 14,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  successBox: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  successTitle: { fontSize: 20, fontWeight: '800', color: S.textLight },
  successText: { fontSize: 13, color: S.textLightSecondary, textAlign: 'center' },
  anotherBtn: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, backgroundColor: S.canvasDarkAlt },
  anotherBtnText: { fontSize: 12, fontWeight: '700', color: S.piggyPink },
});

/* ───────────────────────────────────────────────────────────────── */
/*  SECTION I: Final Studio CTA                                     */
/* ───────────────────────────────────────────────────────────────── */
function StudioFinalCTA({
  onOpenApp,
  isMobile,
}: {
  onOpenApp: () => void;
  isMobile: boolean;
}) {
  return (
    <View style={[ctaStyles.section, isMobile && ctaStyles.sectionMobile]}>
      <View style={ctaStyles.card}>
        <View style={ctaStyles.logoEmblem}>
          <Image
            source={PIGGY_LOGO}
            style={ctaStyles.emblemImage}
            alt="Official Piggy Logo"
          />
        </View>

        <Text style={[ctaStyles.heading, isMobile && { fontSize: 28, lineHeight: 36 }]}>
          Your Money Studio is Open.
        </Text>
        <Text style={ctaStyles.sub}>
          Start tracking with today’s canteen lunch. No credit card required. Works across your web
          browser and Android / iOS devices.
        </Text>

        <View style={ctaStyles.btnRow}>
          <TouchableOpacity style={ctaStyles.launchBtn} onPress={onOpenApp} activeOpacity={0.85}>
            <Text style={ctaStyles.launchBtnText}>Launch SPR Web App</Text>
            <Ionicons name="arrow-forward" size={17} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const ctaStyles = StyleSheet.create({
  section: {
    paddingVertical: 70,
    paddingHorizontal: '6%' as any,
    backgroundColor: S.canvasDarkAlt,
    alignItems: 'center',
  },
  sectionMobile: { paddingVertical: 40, paddingHorizontal: 20 },
  card: {
    maxWidth: 960,
    width: '100%',
    backgroundColor: S.canvasDarkCard,
    borderRadius: 24,
    paddingVertical: 50,
    paddingHorizontal: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: S.piggyPink,
    shadowColor: S.piggyPink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  logoEmblem: {
    width: 74,
    height: 74,
    borderRadius: 37,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: S.piggyPink,
    marginBottom: 18,
    backgroundColor: '#000',
  },
  emblemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heading: { fontSize: 38, fontWeight: '900', color: S.textLight, textAlign: 'center', marginBottom: 12 },
  sub: { fontSize: 15, color: S.textLightSecondary, textAlign: 'center', maxWidth: 560, lineHeight: 24, marginBottom: 28 },
  btnRow: { flexDirection: 'row', gap: 12 },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: S.piggyPink,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 99,
  },
  launchBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Studio Footer                                                   */
/* ───────────────────────────────────────────────────────────────── */
function StudioFooter({
  isMobile,
  scrollTo,
}: {
  isMobile: boolean;
  scrollTo: (key: string) => void;
}) {
  const router = useRouter();

  return (
    <View style={footStyles.wrapper}>
      <View style={[footStyles.container, isMobile && footStyles.containerMobile]}>
        <View style={footStyles.brandCol}>
          <View style={footStyles.logoRow}>
            {/* Primary SPR Logo */}
            <View style={footStyles.logoSmall}>
              <Image
                source={PIGGY_LOGO}
                style={{ width: '100%', height: '100%' }}
                alt="SPR Logo"
              />
            </View>
            {/* Institutional School Logo */}
            <View style={footStyles.schoolLogoSmall}>
              <Image
                source={SCHOOL_LOGO}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
                alt="Saipanyarangsit School Seal"
              />
            </View>
            <Text style={footStyles.brandText}>SPR MONEY STUDIO</Text>
          </View>
          <Text style={footStyles.brandNote}>Student Pecuniary Routine (SPR App)</Text>
          <Text style={footStyles.schoolNote}>Saipanyarangsit School · Mini English Program (MEP)</Text>
          <Text style={footStyles.advisorCredit}>Project Advisor: Mr. Anthony Jose B. Ferrer</Text>
        </View>

        <View style={footStyles.linksCol}>
          <TouchableOpacity onPress={() => scrollTo('problem')} style={footStyles.footLink}>
            <Text style={footStyles.linkText}>The Problem</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollTo('ledger')} style={footStyles.footLink}>
            <Text style={footStyles.linkText}>3-Pillar Ledger</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollTo('ecosystem')} style={footStyles.footLink}>
            <Text style={footStyles.linkText}>Ecosystem</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollTo('simulator')} style={footStyles.footLink}>
            <Text style={footStyles.linkText}>Spending Simulator</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollTo('goals')} style={footStyles.footLink}>
            <Text style={footStyles.linkText}>Piggy Vault</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollTo('research')} style={footStyles.footLink}>
            <Text style={footStyles.linkText}>MEP Survey Data</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollTo('team')} style={footStyles.footLink}>
            <Text style={footStyles.linkText}>Team & Advisor</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/app')} style={footStyles.footLink}>
            <Text style={[footStyles.linkText, { color: S.piggyPink, fontWeight: '800' }]}>
              Open Web App →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={footStyles.bottomBar}>
        <Text style={footStyles.copyText}>
          © {new Date().getFullYear()} Team Piggy Pockets · Saipanyarangsit MEP. All rights reserved.
        </Text>
        <Text style={footStyles.privacyNote}>
          Data Practice: Student pecuniary data is stored with encrypted identifiers and never sold.
        </Text>
      </View>
    </View>
  );
}

const footStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: S.canvasDark,
    borderTopWidth: 1,
    borderTopColor: S.canvasDarkBorder,
    paddingTop: 48,
    paddingBottom: 36,
    paddingHorizontal: '6%' as any,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    marginBottom: 36,
    gap: 32,
  },
  containerMobile: { flexDirection: 'column' },
  brandCol: { flex: 1, gap: 6 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  logoSmall: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: S.piggyPink },
  schoolLogoSmall: { width: 30, height: 30, borderRadius: 6, overflow: 'hidden', backgroundColor: '#FFFFFF', padding: 2, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 15, fontWeight: '900', color: S.textLight, letterSpacing: 0.5 },
  brandNote: { fontSize: 13, color: S.textLightSecondary, fontWeight: '600' },
  schoolNote: { fontSize: 12, color: S.textLightMuted },
  advisorCredit: { fontSize: 12, fontWeight: '700', color: S.amberCoin, marginTop: 4 },
  linksCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  footLink: { paddingVertical: 4 },
  linkText: { fontSize: 13, fontWeight: '600', color: S.textLightSecondary },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: S.canvasDarkBorder,
    paddingTop: 20,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  copyText: { fontSize: 11, color: S.textLightMuted },
  privacyNote: { fontSize: 11, color: S.textLightMuted },
});

const pageStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: S.canvasDark,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
