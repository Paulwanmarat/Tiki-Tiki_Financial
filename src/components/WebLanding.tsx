import { Colors } from '@/constants/theme';
import { LOCAL_API_URL } from '@/services/ai/client';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SurveyResults } from './SurveyResults';

/* ───────────────────────── colour tokens ───────────────────────── */
const C = {
  bg: '#F8FAFC',
  white: '#FFFFFF',
  dark: '#07111F',
  darkAlt: '#0B1728',
  slate700: '#334155',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  primary: '#2563EB',      // electric blue
  primaryDark: '#3B82F6',
  primaryLight: '#EFF6FF',
  cyan: '#06B6D4',
  lavender: '#8B5CF6',
  success: '#22C55E',
  warning: Colors.light.warning,
  danger: Colors.light.danger,
};

/* ───────────────────────────────────────────────────────────────── */
/*  Root                                                            */
/* ───────────────────────────────────────────────────────────────── */
export function WebLanding() {
  const windowWidth = Dimensions.get('window').width;
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const scrollRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<Record<string, number>>({});

  const scrollTo = useCallback((key: string) => {
    const y = sectionRefs.current[key];
    if (y !== undefined && scrollRef.current) {
      // Offset by 80 to account for fixed navbar
      scrollRef.current.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }
  }, []);

  const onLayout = useCallback((key: string, y: number) => {
    sectionRefs.current[key] = y;
  }, []);

  return (
    <View style={styles.root}>
      <Navbar isMobile={isMobile} scrollTo={scrollTo} />
      <ScrollView
        ref={scrollRef}
        style={styles.scrollRoot}
        contentContainerStyle={styles.rootContent}
      >
        <Hero isMobile={isMobile} isTablet={isTablet} scrollTo={scrollTo} />

        <View onLayout={(e) => onLayout('why', e.nativeEvent.layout.y)}>
          <TheProblem isMobile={isMobile} />
          <CoreIdea isMobile={isMobile} />
          <TargetUsers isMobile={isMobile} />
        </View>

        <StorytellingFlow isMobile={isMobile} />

        <View onLayout={(e) => onLayout('features', e.nativeEvent.layout.y)}>
          <Differentiation isMobile={isMobile} />
          <AISection isMobile={isMobile} />
          <GoalsSimulator isMobile={isMobile} />
          <MenuScanner isMobile={isMobile} />
        </View>

        <View onLayout={(e) => onLayout('research', e.nativeEvent.layout.y)}>
          <SurveyResults />
          <UserAdoption isMobile={isMobile} />
        </View>

        <View onLayout={(e) => onLayout('team', e.nativeEvent.layout.y)}>
          <DevelopmentTimeline isMobile={isMobile} />
          <TechStack isMobile={isMobile} />
          <TeamSection isMobile={isMobile} isTablet={isTablet} />
        </View>

        <View onLayout={(e) => onLayout('feedback', e.nativeEvent.layout.y)}>
          <WebFeedback isMobile={isMobile} />
        </View>

        <View onLayout={(e) => onLayout('cta', e.nativeEvent.layout.y)}>
          <AppsComingSoon isMobile={isMobile} />
          <GetStarted isMobile={isMobile} />
        </View>
        <Footer isMobile={isMobile} scrollTo={scrollTo} />
      </ScrollView>
    </View>
  );
}

/* ───────────────────────────────────────────────────────────────── */
/*  Navbar                                                          */
/* ───────────────────────────────────────────────────────────────── */
function Navbar({ isMobile, scrollTo }: { isMobile: boolean; scrollTo: (k: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { label: 'Why SPR', key: 'why' },
    { label: 'Features', key: 'features' },
    { label: 'Research', key: 'research' },
    { label: 'Team', key: 'team' },
    { label: 'Feedback', key: 'feedback' },
  ];

  return (
    <View style={[navStyles.wrapper, isMobile && navStyles.wrapperMobile]}>
      <View style={navStyles.brand}>
        <View style={navStyles.logoCircle}>
          <Text style={navStyles.logoText}>S</Text>
        </View>
        <Text style={navStyles.brandName}>SPR App</Text>
      </View>

      {isMobile ? (
        <>
          <Pressable
            onPress={() => setMenuOpen(!menuOpen)}
            accessibilityLabel="Toggle navigation menu"
            accessibilityRole="button"
            style={navStyles.hamburger}
          >
            <Ionicons name={menuOpen ? 'close' : 'menu'} size={28} color={C.dark} />
          </Pressable>

          {menuOpen && (
            <View style={navStyles.mobileMenu}>
              {links.map((l) => (
                <Pressable
                  key={l.key}
                  onPress={() => { scrollTo(l.key); setMenuOpen(false); }}
                  style={navStyles.mobileLink}
                  accessibilityRole="link"
                >
                  <Text style={navStyles.mobileLinkText}>{l.label}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => { scrollTo('cta'); setMenuOpen(false); }}
                style={navStyles.mobileCta}
                accessibilityRole="link"
              >
                <Text style={navStyles.mobileCtaText}>Get Started</Text>
              </Pressable>
            </View>
          )}
        </>
      ) : (
        <View style={navStyles.desktopLinks}>
          {links.map((l) => (
            <Pressable key={l.key} onPress={() => scrollTo(l.key)} accessibilityRole="link">
              <Text style={navStyles.desktopLinkText}>{l.label}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => scrollTo('cta')}
            style={navStyles.desktopCta}
            accessibilityRole="link"
          >
            <Text style={navStyles.desktopCtaText}>Get Started</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const navStyles = StyleSheet.create({
  wrapper: {
    ...(Platform.OS === 'web'
      ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }
      : {}),
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '8%' as any,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  } as any,
  wrapperMobile: { paddingHorizontal: 20, flexWrap: 'wrap' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#FFF', fontWeight: '700', fontSize: 18, fontFamily: 'Inter' },
  brandName: { fontSize: 20, fontWeight: '700', color: C.dark, fontFamily: 'Inter' },
  hamburger: { padding: 6 },
  mobileMenu: {
    width: '100%',
    paddingTop: 16,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  mobileLink: { paddingVertical: 12, paddingHorizontal: 8 },
  mobileLinkText: { fontSize: 16, fontWeight: '500', color: C.slate700, fontFamily: 'Inter' },
  mobileCta: {
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  mobileCtaText: { color: '#FFF', fontWeight: '600', fontSize: 16, fontFamily: 'Inter' },
  desktopLinks: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  desktopLinkText: { fontSize: 15, fontWeight: '500', color: C.slate700, fontFamily: 'Inter' },
  desktopCta: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  desktopCtaText: { color: '#FFF', fontWeight: '600', fontSize: 15, fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Hero                                                            */
/* ───────────────────────────────────────────────────────────────── */
function Hero({ isMobile, isTablet, scrollTo }: { isMobile: boolean; isTablet: boolean; scrollTo: (k: string) => void }) {
  return (
    <View style={[heroStyles.wrap, isMobile && heroStyles.wrapMobile]}>
      <View style={[heroStyles.text, isMobile && heroStyles.textMobile]}>
        <Text style={heroStyles.badge}>STUDENT PECUNIARY ROUTINE</Text>
        <Text style={[heroStyles.heading, isMobile && heroStyles.headingMobile]}>
          Understand your money.{'\n'}Spend smarter.{'\n'}Reach your goals.
        </Text>
        <Text style={[heroStyles.sub, isMobile && heroStyles.subMobile]}>
          SPR App is an AI-powered money management app designed to help students and young people understand spending, simulate purchases, plan savings, and build healthier financial habits.
        </Text>

        <View style={heroStyles.ctas}>
          <Pressable style={heroStyles.primaryBtn} onPress={() => scrollTo('cta')}>
            <Text style={heroStyles.primaryBtnText}>Explore SPR App</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </Pressable>
          <Pressable style={heroStyles.secondaryBtn} onPress={() => scrollTo('why')}>
            <Text style={heroStyles.secondaryBtnText}>Why SPR?</Text>
          </Pressable>
        </View>
      </View>
      {!isMobile && (
        <View style={heroStyles.mockupArea}>
          <AppMockup compact={isTablet} />
        </View>
      )}
    </View>
  );
}

const heroStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: '8%' as any, paddingTop: 60, paddingBottom: 80,
    backgroundColor: C.white,
  },
  wrapMobile: { flexDirection: 'column', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 48 },
  text: { flex: 1, maxWidth: 600 },
  textMobile: { maxWidth: '100%' as any },
  badge: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.primary, marginBottom: 16, fontFamily: 'Inter' },
  heading: { fontSize: 52, fontWeight: '800', color: C.dark, lineHeight: 60, marginBottom: 20, fontFamily: 'Inter' },
  headingMobile: { fontSize: 36, lineHeight: 44 },
  sub: { fontSize: 18, color: C.slate500, lineHeight: 28, marginBottom: 32, fontFamily: 'Inter' },
  subMobile: { fontSize: 16, lineHeight: 26 },
  ctas: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginBottom: 24 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 12 },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16, fontFamily: 'Inter' },
  secondaryBtn: { paddingHorizontal: 28, paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: C.slate200 },
  secondaryBtnText: { color: C.slate700, fontWeight: '600', fontSize: 16, fontFamily: 'Inter' },
  mockupArea: { marginLeft: 40 },
});

/* ───────────────────────────────────────────────────────────────── */
/*  The Problem                                                     */
/* ───────────────────────────────────────────────────────────────── */
function TheProblem({ isMobile }: { isMobile: boolean }) {
  return (
    <View style={[probStyles.section, isMobile && probStyles.sectionMobile]}>
      <Text style={probStyles.badge}>THE PROBLEM</Text>
      <Text style={[probStyles.heading, isMobile && { fontSize: 32, lineHeight: 40 }]}>
        Small purchases can become big problems.
      </Text>
      <Text style={probStyles.desc}>
        Students and young adults often struggle with controlling spending, planning savings, and deciding whether purchases are worth the money.
      </Text>
      <View style={probStyles.storyBox}>
        <Text style={probStyles.storyText}>
          The team experienced this problem while buying materials for a school project, where many small purchases gradually added up to much more than expected.
        </Text>
      </View>
      <View style={[probStyles.cardsRow, isMobile && probStyles.cardsRowMobile]}>
        <View style={probStyles.pCard}><Text style={probStyles.pCardAmt}>฿45</Text></View>
        <View style={probStyles.pCard}><Text style={probStyles.pCardAmt}>฿120</Text></View>
        <View style={probStyles.pCard}><Text style={probStyles.pCardAmt}>฿60</Text></View>
        <View style={probStyles.pCard}><Text style={probStyles.pCardAmt}>฿85</Text></View>
      </View>
      <Ionicons name="arrow-down" size={32} color={C.slate400} style={{ marginVertical: 24 }} />
      <Text style={probStyles.punchline}>"Where did all the money go?"</Text>
    </View>
  );
}
const probStyles = StyleSheet.create({
  section: { alignItems: 'center', paddingHorizontal: '8%' as any, paddingVertical: 80, backgroundColor: C.bg },
  sectionMobile: { paddingHorizontal: 24, paddingVertical: 60 },
  badge: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.primary, marginBottom: 16, fontFamily: 'Inter' },
  heading: { fontSize: 40, fontWeight: '800', color: C.dark, textAlign: 'center', marginBottom: 20, fontFamily: 'Inter' },
  desc: { fontSize: 18, color: C.slate500, textAlign: 'center', maxWidth: 680, lineHeight: 28, marginBottom: 24, fontFamily: 'Inter' },
  storyBox: { backgroundColor: C.white, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: C.primaryLight, maxWidth: 680, marginBottom: 40 },
  storyText: { fontSize: 16, color: C.slate700, fontStyle: 'italic', textAlign: 'center', lineHeight: 26, fontFamily: 'Inter' },
  cardsRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  cardsRowMobile: { flexWrap: 'wrap', justifyContent: 'center' },
  pCard: { backgroundColor: C.white, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: C.slate200, shadowColor: C.slate400, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  pCardAmt: { fontSize: 18, fontWeight: '700', color: C.danger, fontFamily: 'Inter' },
  punchline: { fontSize: 24, fontWeight: '700', color: C.dark, fontFamily: 'Inter', fontStyle: 'italic' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Core Idea (Solution)                                            */
/* ───────────────────────────────────────────────────────────────── */
function CoreIdea({ isMobile }: { isMobile: boolean }) {
  return (
    <View style={coreStyles.section}>
      <Text style={[coreStyles.statement, isMobile && { fontSize: 24, lineHeight: 34 }]}>
        SPR is an AI-powered money management app that helps young people understand, simulate, and plan spending while making saving fun through interactive games.
      </Text>
      <View style={[coreStyles.pillars, isMobile && coreStyles.pillarsMobile]}>
        <View style={coreStyles.pillar}><Text style={coreStyles.pillarText}>UNDERSTAND</Text></View>
        <View style={coreStyles.pillar}><Text style={coreStyles.pillarText}>SIMULATE</Text></View>
        <View style={coreStyles.pillar}><Text style={coreStyles.pillarText}>PLAN</Text></View>
        <View style={coreStyles.pillar}><Text style={coreStyles.pillarText}>SAVE</Text></View>
      </View>
    </View>
  );
}
const coreStyles = StyleSheet.create({
  section: { backgroundColor: C.primary, paddingHorizontal: '8%' as any, paddingVertical: 80, alignItems: 'center' },
  statement: { fontSize: 32, fontWeight: '700', color: '#FFF', textAlign: 'center', maxWidth: 800, lineHeight: 46, marginBottom: 48, fontFamily: 'Inter' },
  pillars: { flexDirection: 'row', gap: 24, flexWrap: 'wrap', justifyContent: 'center' },
  pillarsMobile: { gap: 12 },
  pillar: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 100 },
  pillarText: { color: '#FFF', fontWeight: '700', fontSize: 15, letterSpacing: 1, fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Who Is SPR For?                                                 */
/* ───────────────────────────────────────────────────────────────── */
function TargetUsers({ isMobile }: { isMobile: boolean }) {
  return (
    <View style={[tuStyles.section, isMobile && tuStyles.sectionMobile]}>
      <View style={tuStyles.content}>
        <Text style={tuStyles.badge}>WHO IS SPR FOR?</Text>
        <Text style={tuStyles.heading}>Students, Teenagers, Young adults</Text>
        <Text style={tuStyles.desc}>
          SPR is designed for people who are still developing healthy financial habits and want practical guidance without the complexity of traditional financial tools.
        </Text>
      </View>
      <View style={tuStyles.statBox}>
        <Text style={tuStyles.statPct}>54.8%</Text>
        <Text style={tuStyles.statLabel}>40 / 73 respondents</Text>
        <Text style={tuStyles.statDesc}>reported a bad financial habit in the team's survey.</Text>
      </View>
    </View>
  );
}
const tuStyles = StyleSheet.create({
  section: { flexDirection: 'row', paddingHorizontal: '8%' as any, paddingVertical: 80, backgroundColor: C.white, alignItems: 'center', gap: 48 },
  sectionMobile: { flexDirection: 'column', paddingHorizontal: 24, paddingVertical: 60 },
  content: { flex: 1, maxWidth: 500 },
  badge: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.primary, marginBottom: 12, fontFamily: 'Inter' },
  heading: { fontSize: 32, fontWeight: '800', color: C.dark, marginBottom: 16, fontFamily: 'Inter' },
  desc: { fontSize: 16, color: C.slate500, lineHeight: 26, fontFamily: 'Inter' },
  statBox: { backgroundColor: C.bg, padding: 32, borderRadius: 20, borderWidth: 1, borderColor: C.slate200, alignItems: 'center', minWidth: 300 },
  statPct: { fontSize: 56, fontWeight: '800', color: C.danger, marginBottom: 4, fontFamily: 'Inter' },
  statLabel: { fontSize: 16, fontWeight: '700', color: C.dark, marginBottom: 8, fontFamily: 'Inter' },
  statDesc: { fontSize: 14, color: C.slate500, textAlign: 'center', fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Storytelling Flow                                               */
/* ───────────────────────────────────────────────────────────────── */
function StorytellingFlow({ isMobile }: { isMobile: boolean }) {
  const steps = [
    { num: '01', title: 'TRACK', desc: 'Record income and expenses.' },
    { num: '02', title: 'UNDERSTAND', desc: 'See spending patterns, goals, and daily limits.' },
    { num: '03', title: 'DECIDE', desc: 'Use simulation and AI-assisted guidance before spending.' },
  ];
  return (
    <View style={flowStyles.section}>
      <View style={[flowStyles.grid, isMobile && flowStyles.gridMobile]}>
        {steps.map((s, i) => (
          <React.Fragment key={s.num}>
            <View style={flowStyles.step}>
              <Text style={flowStyles.num}>{s.num}</Text>
              <Text style={flowStyles.title}>{s.title}</Text>
              <Text style={flowStyles.desc}>{s.desc}</Text>
            </View>
            {i < 2 && !isMobile && <Ionicons name="chevron-forward" size={32} color={C.slate200} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
const flowStyles = StyleSheet.create({
  section: { backgroundColor: C.dark, paddingVertical: 80, paddingHorizontal: '8%' as any, alignItems: 'center' },
  grid: { flexDirection: 'row', alignItems: 'center', gap: 32, justifyContent: 'center' },
  gridMobile: { flexDirection: 'column', gap: 40 },
  step: { alignItems: 'center', maxWidth: 240 },
  num: { fontSize: 48, fontWeight: '800', color: C.primary, opacity: 0.8, marginBottom: 8, fontFamily: 'Inter' },
  title: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 12, letterSpacing: 1, fontFamily: 'Inter' },
  desc: { fontSize: 15, color: C.slate400, textAlign: 'center', lineHeight: 22, fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Differentiation (Not just another budgeting app)                */
/* ───────────────────────────────────────────────────────────────── */
function Differentiation({ isMobile }: { isMobile: boolean }) {
  const features = [
    { title: 'AI Financial Assistant', desc: 'Personalized guidance based on financial context.', icon: 'sparkles-outline', color: C.lavender, size: 2 },
    { title: 'Spending Simulation', desc: 'See the possible impact of a purchase before making it.', icon: 'calculator-outline', color: C.warning, size: 2 },
    { title: 'Goal-Based Planning', desc: 'Understand how spending affects savings goals.', icon: 'flag-outline', color: C.success, size: 1 },
    { title: 'Interactive Saving Game', desc: 'Make saving more engaging through the Saving Pig experience.', icon: 'happy-outline', color: '#EC4899', size: 1 },
    { title: 'Daily Spending Limit', desc: 'Know your safe spending bounds.', icon: 'speedometer-outline', color: C.primary, size: 1 },
    { title: 'Transaction Tracking', desc: 'Seamlessly record everything.', icon: 'swap-vertical-outline', color: C.cyan, size: 1 },
    { title: 'Menu Scanner', desc: 'OCR-powered menu comparison.', icon: 'camera-outline', color: '#F97316', size: 1 },
  ];

  return (
    <View style={diffStyles.section}>
      <Text style={diffStyles.heading}>Not just another budgeting app.</Text>
      <Text style={diffStyles.sub}>
        Many tools focus only on tracking and budgets. SPR introduces context, simulation, and intelligence.
      </Text>
      <View style={diffStyles.bento}>
        {features.map((f, i) => (
          <View key={i} style={[
            diffStyles.bentoCard,
            { borderColor: `${f.color}30` },
            !isMobile && f.size === 2 ? { minWidth: '48%' as any } : { minWidth: isMobile ? '100%' : '31%' }
          ]}>
            <View style={[diffStyles.iconBox, { backgroundColor: `${f.color}15` }]}>
              <Ionicons name={f.icon as any} size={28} color={f.color} />
            </View>
            <Text style={diffStyles.cardTitle}>{f.title}</Text>
            <Text style={diffStyles.cardDesc}>{f.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const diffStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingVertical: 80, backgroundColor: C.bg, alignItems: 'center' },
  heading: { fontSize: 36, fontWeight: '800', color: C.dark, textAlign: 'center', marginBottom: 16, fontFamily: 'Inter' },
  sub: { fontSize: 18, color: C.slate500, textAlign: 'center', maxWidth: 680, marginBottom: 48, fontFamily: 'Inter' },
  bento: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', maxWidth: 1100 },
  bentoCard: { backgroundColor: C.white, padding: 32, borderRadius: 20, borderWidth: 1, flex: 1 },
  iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: C.dark, marginBottom: 8, fontFamily: 'Inter' },
  cardDesc: { fontSize: 15, color: C.slate500, lineHeight: 24, fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  AI Section                                                      */
/* ───────────────────────────────────────────────────────────────── */
function AISection({ isMobile }: { isMobile: boolean }) {
  const prompts = [
    { q: 'Can I afford this?', icon: 'help-circle-outline' },
    { q: 'How much should I save?', icon: 'trending-up-outline' },
    { q: 'Can I still reach my goal?', icon: 'flag-outline' },
    { q: 'Why did my spending increase?', icon: 'analytics-outline' },
  ];
  return (
    <View style={[aiStyles.section, isMobile && aiStyles.sectionMobile]}>
      <View style={aiStyles.content}>
        <Text style={aiStyles.heading}>Your money, with context.</Text>
        <Text style={aiStyles.desc}>
          The AI Financial Assistant uses your actual balance, limits, and goals to provide personalized guidance. Ask natural questions and get context-aware answers.
        </Text>
      </View>
      <View style={aiStyles.chatBox}>
        <View style={aiStyles.chatHeader}>
          <View style={aiStyles.dot} />
          <Text style={aiStyles.chatTitle}>Example Prompts</Text>
        </View>
        {prompts.map((p) => (
          <View key={p.q} style={aiStyles.promptRow}>
            <Ionicons name={p.icon as any} size={20} color={C.primaryLight} />
            <Text style={aiStyles.promptText}>"{p.q}"</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const aiStyles = StyleSheet.create({
  section: { backgroundColor: C.darkAlt, flexDirection: 'row', paddingHorizontal: '8%' as any, paddingVertical: 100, gap: 60, alignItems: 'center' },
  sectionMobile: { flexDirection: 'column', paddingHorizontal: 24 },
  content: { flex: 1, maxWidth: 500 },
  heading: { fontSize: 40, fontWeight: '800', color: '#FFF', marginBottom: 20, fontFamily: 'Inter' },
  desc: { fontSize: 18, color: C.slate400, lineHeight: 28, fontFamily: 'Inter' },
  chatBox: { flex: 1, maxWidth: 460, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.success },
  chatTitle: { color: '#FFF', fontWeight: '600', fontSize: 16, fontFamily: 'Inter' },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.08)', padding: 16, borderRadius: 12, marginBottom: 12 },
  promptText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontStyle: 'italic', fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Goals Simulator (Merged Flow)                                   */
/* ───────────────────────────────────────────────────────────────── */
function GoalsSimulator({ isMobile }: { isMobile: boolean }) {
  const steps = ['Set a goal', 'Consider a purchase', 'Simulate its impact', 'Understand the trade-off', 'Keep saving'];
  return (
    <View style={gsStyles.section}>
      <Text style={gsStyles.heading}>See the future of your wallet.</Text>
      <Text style={gsStyles.desc}>
        Combine the Spending Simulator and Saving Pig to understand how today's choices affect tomorrow's goals.
      </Text>
      <View style={[gsStyles.flow, isMobile && gsStyles.flowMobile]}>
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <View style={gsStyles.stepNode}>
              <Text style={gsStyles.stepText}>{s}</Text>
            </View>
            {i < steps.length - 1 && <Ionicons name="arrow-down" size={24} color={C.primary} style={!isMobile && { transform: [{ rotate: '-90deg' }] }} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
const gsStyles = StyleSheet.create({
  section: { backgroundColor: '#FFF7ED', paddingHorizontal: '8%' as any, paddingVertical: 80, alignItems: 'center' },
  heading: { fontSize: 36, fontWeight: '800', color: C.dark, marginBottom: 16, fontFamily: 'Inter', textAlign: 'center' },
  desc: { fontSize: 18, color: C.slate700, textAlign: 'center', maxWidth: 600, marginBottom: 48, fontFamily: 'Inter' },
  flow: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  flowMobile: { flexDirection: 'column' },
  stepNode: { backgroundColor: '#FFEDD5', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 100, borderWidth: 1, borderColor: '#FDBA74' },
  stepText: { color: '#C2410C', fontWeight: '700', fontSize: 15, fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Menu Scanner OCR Flow                                           */
/* ───────────────────────────────────────────────────────────────── */
function MenuScanner({ isMobile }: { isMobile: boolean }) {
  const steps = ['Menu', 'OCR', 'Review / edit', 'Compare', 'Budget-aware choice'];
  return (
    <View style={scanStyles.section}>
      <Text style={scanStyles.badge}>MENU SCANNER</Text>
      <Text style={scanStyles.heading}>Scan. Compare. Decide.</Text>
      <Text style={scanStyles.desc}>
        Point your camera at a restaurant menu to automatically extract items and compare them directly against your daily spending limit.
      </Text>
      <View style={[scanStyles.flow, isMobile && scanStyles.flowMobile]}>
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <View style={scanStyles.node}>
              <Text style={scanStyles.nodeText}>{s}</Text>
            </View>
            {i < steps.length - 1 && <Ionicons name="arrow-forward" size={20} color={C.slate400} style={isMobile && { transform: [{ rotate: '90deg' }], marginVertical: 8 }} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
const scanStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingVertical: 80, backgroundColor: C.white, alignItems: 'center' },
  badge: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.primary, marginBottom: 12, fontFamily: 'Inter' },
  heading: { fontSize: 36, fontWeight: '800', color: C.dark, textAlign: 'center', marginBottom: 16, fontFamily: 'Inter' },
  desc: { fontSize: 16, color: C.slate500, textAlign: 'center', maxWidth: 600, marginBottom: 48, lineHeight: 26, fontFamily: 'Inter' },
  flow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  flowMobile: { flexDirection: 'column' },
  node: { backgroundColor: C.slate100, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  nodeText: { color: C.slate700, fontWeight: '600', fontSize: 14, fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  User Adoption Challenge                                         */
/* ───────────────────────────────────────────────────────────────── */
function UserAdoption({ isMobile }: { isMobile: boolean }) {
  return (
    <View style={[uaStyles.section, isMobile && uaStyles.sectionMobile]}>
      <View style={uaStyles.left}>
        <Text style={uaStyles.heading}>The Adoption Challenge</Text>
        <Text style={uaStyles.desc}>
          Users may see SPR as just another generic budgeting app. To solve this, SPR clearly communicates its differentiated features tailored specifically for teenagers and young adults.
        </Text>
      </View>
      <View style={uaStyles.right}>
        <View style={uaStyles.card}>
          <Text style={uaStyles.q}>"How do we stand out?"</Text>
          <Ionicons name="arrow-down" size={24} color={C.primary} style={{ marginVertical: 16 }} />
          <View style={{ gap: 8, alignItems: 'center' }}>
            <Text style={uaStyles.a}>AI Guidance</Text>
            <Text style={uaStyles.a}>Simulation</Text>
            <Text style={uaStyles.a}>Goals</Text>
            <Text style={uaStyles.a}>Saving Game</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
const uaStyles = StyleSheet.create({
  section: { flexDirection: 'row', paddingHorizontal: '8%' as any, paddingVertical: 80, backgroundColor: C.primaryLight, gap: 48, alignItems: 'center' },
  sectionMobile: { flexDirection: 'column', paddingHorizontal: 24 },
  left: { flex: 1 },
  heading: { fontSize: 32, fontWeight: '800', color: C.dark, marginBottom: 16, fontFamily: 'Inter' },
  desc: { fontSize: 16, color: C.slate700, lineHeight: 26, fontFamily: 'Inter' },
  right: { flex: 1, alignItems: 'center' },
  card: { backgroundColor: C.white, padding: 32, borderRadius: 24, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  q: { fontSize: 18, fontWeight: '700', color: C.dark, fontStyle: 'italic', fontFamily: 'Inter' },
  a: { fontSize: 16, fontWeight: '600', color: C.primary, backgroundColor: C.primary + '15', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, overflow: 'hidden', fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Development Timeline                                            */
/* ───────────────────────────────────────────────────────────────── */
function DevelopmentTimeline({ isMobile }: { isMobile: boolean }) {
  return (
    <View style={timeStyles.section}>
      <Text style={timeStyles.badge}>PROJECT DEVELOPMENT SPRINT</Text>
      <Text style={timeStyles.heading}>Built with purpose.</Text>
      <Text style={timeStyles.desc}>
        The biggest challenge was creating features that clearly differentiate SPR from competing budgeting applications within a short timeframe.
      </Text>

      <View style={[timeStyles.timeline, isMobile && timeStyles.timelineMobile]}>
        <View style={timeStyles.weekCard}>
          <Text style={timeStyles.weekTitle}>WEEK 01</Text>
          <Text style={timeStyles.li}>• Ideas</Text>
          <Text style={timeStyles.li}>• Feature planning</Text>
          <Text style={timeStyles.li}>• Product direction</Text>
          <Text style={timeStyles.li}>• Presentation preparation</Text>
        </View>
        {!isMobile && <View style={timeStyles.line} />}
        <View style={timeStyles.weekCard}>
          <Text style={timeStyles.weekTitle}>WEEK 02</Text>
          <Text style={timeStyles.li}>• Implementation completion</Text>
          <Text style={timeStyles.li}>• Slides</Text>
          <Text style={timeStyles.li}>• Video production</Text>
          <Text style={timeStyles.li}>• Final preparation</Text>
        </View>
      </View>
    </View>
  );
}
const timeStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingVertical: 80, backgroundColor: C.white, alignItems: 'center' },
  badge: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.primary, marginBottom: 12, fontFamily: 'Inter' },
  heading: { fontSize: 36, fontWeight: '800', color: C.dark, textAlign: 'center', marginBottom: 16, fontFamily: 'Inter' },
  desc: { fontSize: 16, color: C.slate500, textAlign: 'center', maxWidth: 600, marginBottom: 48, lineHeight: 26, fontFamily: 'Inter' },
  timeline: { flexDirection: 'row', alignItems: 'stretch', gap: 24, width: '100%', maxWidth: 800, justifyContent: 'center' },
  timelineMobile: { flexDirection: 'column', alignItems: 'center' },
  weekCard: { flex: 1, backgroundColor: C.bg, padding: 32, borderRadius: 20, borderWidth: 1, borderColor: C.slate200, minWidth: 280 },
  weekTitle: { fontSize: 20, fontWeight: '800', color: C.dark, marginBottom: 20, fontFamily: 'Inter' },
  li: { fontSize: 15, color: C.slate700, marginBottom: 12, fontFamily: 'Inter' },
  line: { width: 40, height: 2, backgroundColor: C.slate200, alignSelf: 'center' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Tech Stack                                                      */
/* ───────────────────────────────────────────────────────────────── */
function TechStack({ isMobile }: { isMobile: boolean }) {
  const stack = ['React Native', 'TypeScript', 'JavaScript', 'Expo', 'PostgreSQL', 'AI / OCR'];
  return (
    <View style={techStyles.section}>
      <Text style={techStyles.title}>BUILT WITH</Text>
      <View style={techStyles.row}>
        {stack.map((t) => (
          <View key={t} style={techStyles.badge}>
            <Text style={techStyles.badgeText}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const techStyles = StyleSheet.create({
  section: { backgroundColor: C.dark, paddingVertical: 40, paddingHorizontal: '8%' as any, alignItems: 'center' },
  title: { fontSize: 12, fontWeight: '700', color: C.slate400, letterSpacing: 2, marginBottom: 20, fontFamily: 'Inter' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 800 },
  badge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 100 },
  badgeText: { color: '#FFF', fontSize: 14, fontWeight: '600', fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Team Section                                                    */
/* ───────────────────────────────────────────────────────────────── */
function TeamSection({ isMobile, isTablet }: { isMobile: boolean; isTablet: boolean }) {
  const members = [
    { name: 'Witchayaporn Boriraj', role: 'Presentation Slide Maker', image: require('../../assets/images/member1.jpg') },
    { name: 'Pimnara Boonyawatputthi', role: 'Researcher', image: require('../../assets/images/member2.jpg') },
    { name: 'Wachrawit Jindawong', role: 'Presentation Slide Maker', image: require('../../assets/images/member3.jpg') },
    { name: 'Phanyawat Wanmarat', role: 'Programmer', image: require('../../assets/images/member4.png') },
  ];

  return (
    <View style={teamStyles.section}>
      <Text style={teamStyles.heading}>Meet Piggy Pockets</Text>
      <Text style={teamStyles.sub}>Built by students from Saipanyarangsit School's MEP Program.</Text>
      <View style={[
        teamStyles.grid,
        isMobile ? teamStyles.gridMobile : (isTablet ? teamStyles.gridTablet : teamStyles.gridDesktop)
      ]}>
        {members.map((m, i) => (
          <View key={i} style={teamStyles.card}>
            <View style={teamStyles.imgWrapper}>
              {m.image ? (
                // If real images are added to assets/images/ later, this will render them if require resolves.
                // For web compatibility with dynamic require failures, we fallback nicely.
                <Image source={m.image} style={teamStyles.img} alt={`Photo of ${m.name}`} />
              ) : (
                <View style={teamStyles.placeholder}>
                  <Ionicons name="person" size={48} color={C.slate400} />
                </View>
              )}
            </View>
            <Text style={teamStyles.name}>{m.name}</Text>
            <Text style={teamStyles.role}>{m.role}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const teamStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingVertical: 100, backgroundColor: C.bg, alignItems: 'center' },
  heading: { fontSize: 36, fontWeight: '800', color: C.dark, marginBottom: 12, fontFamily: 'Inter' },
  sub: { fontSize: 16, color: C.slate500, marginBottom: 48, fontFamily: 'Inter', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, justifyContent: 'center', width: '100%', maxWidth: 1200 },
  gridDesktop: {},
  gridTablet: {},
  gridMobile: { flexDirection: 'column', alignItems: 'center' },
  card: { backgroundColor: C.white, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: C.slate200, width: 260, shadowColor: C.slate400, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 },
  imgWrapper: { width: 140, height: 140, borderRadius: 70, overflow: 'hidden', marginBottom: 20, backgroundColor: C.slate100, borderWidth: 4, borderColor: C.primaryLight },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: C.slate100 },
  name: { fontSize: 18, fontWeight: '700', color: C.dark, textAlign: 'center', marginBottom: 6, fontFamily: 'Inter' },
  role: { fontSize: 13, fontWeight: '600', color: C.primary, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Inter', textAlign: 'center' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Feedback                                                        */
/* ───────────────────────────────────────────────────────────────── */
function WebFeedback({ isMobile }: { isMobile: boolean }) {
  const [type, setType] = useState('feature');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!message.trim()) { setError('Please enter your feedback message.'); return; }
    setError(''); setLoading(true);
    try {
      const response = await fetch(`${LOCAL_API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message, contact_email: email, platform: 'web', app_version: 'landing' }),
      });
      if (response.ok) { setSuccess(true); setMessage(''); setEmail(''); }
      else { const data = await response.json(); setError(data.error || 'Failed to submit feedback.'); }
    } catch { setError('Network error. Please check your connection and try again.'); }
    finally { setLoading(false); }
  };

  const types = ['feature', 'bug', 'other'] as const;

  return (
    <View style={fbStyles.section}>
      <Text style={fbStyles.label}>FEEDBACK</Text>
      <Text style={fbStyles.heading}>Help us improve SPR App</Text>
      <View style={[fbStyles.form, isMobile && fbStyles.formMobile]}>
        {success ? (
          <View style={fbStyles.successBox}>
            <Ionicons name="checkmark-circle" size={56} color={C.success} />
            <Text style={fbStyles.successTitle}>Thank you!</Text>
            <Pressable style={fbStyles.btn} onPress={() => setSuccess(false)}>
              <Text style={fbStyles.btnText}>Send More Feedback</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={fbStyles.fieldLabel}>Category</Text>
            <View style={fbStyles.typeRow}>
              {types.map((t) => (
                <Pressable key={t} style={[fbStyles.typeBtn, type === t && fbStyles.typeBtnActive]} onPress={() => setType(t)}>
                  <Text style={[fbStyles.typeText, type === t && fbStyles.typeTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={fbStyles.fieldLabel}>Message</Text>
            {/* @ts-ignore web textarea */}
            <textarea
              style={{ width: '100%', padding: 14, borderRadius: 10, border: `1px solid ${C.slate200}`, fontSize: 15, minHeight: 120, fontFamily: 'inherit', resize: 'vertical', outlineStyle: 'none' } as any}
              placeholder="Tell us what you think..." value={message} onChange={(e: any) => setMessage(e.target.value)}
            />
            <Text style={fbStyles.fieldLabel}>Email (optional)</Text>
            {/* @ts-ignore web input */}
            <input
              style={{ width: '100%', padding: 14, borderRadius: 10, border: `1px solid ${C.slate200}`, fontSize: 15, outlineStyle: 'none' } as any}
              type="email" placeholder="you@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)}
            />
            {error ? <Text style={fbStyles.errorText}>{error}</Text> : null}
            <Pressable style={[fbStyles.btn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={fbStyles.btnText}>Submit Feedback</Text>}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
const fbStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingVertical: 80, backgroundColor: C.white, alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.primary, marginBottom: 12, fontFamily: 'Inter' },
  heading: { fontSize: 36, fontWeight: '800', color: C.dark, textAlign: 'center', marginBottom: 32, fontFamily: 'Inter' },
  form: { width: '100%', maxWidth: 540, backgroundColor: C.bg, borderRadius: 20, padding: 32, borderWidth: 1, borderColor: C.slate200 },
  formMobile: { padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.slate700, marginBottom: 6, marginTop: 16, fontFamily: 'Inter' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: C.slate200, backgroundColor: C.white },
  typeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  typeText: { fontSize: 14, fontWeight: '500', color: C.slate500, fontFamily: 'Inter' },
  typeTextActive: { color: '#FFF' },
  btn: { backgroundColor: C.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600', fontFamily: 'Inter' },
  errorText: { color: C.danger, fontSize: 13, marginTop: 8, fontFamily: 'Inter' },
  successBox: { alignItems: 'center', paddingVertical: 32 },
  successTitle: { fontSize: 24, fontWeight: '700', color: C.dark, marginTop: 12, marginBottom: 24, fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Apps Coming Soon                                                */
/* ───────────────────────────────────────────────────────────────── */
function AppsComingSoon({ isMobile }: { isMobile: boolean }) {
  return (
    <View style={[soonStyles.section, isMobile && soonStyles.sectionMobile]}>
      <Text style={soonStyles.badge}>COMING SOON</Text>
      <Text style={[soonStyles.heading, isMobile && { fontSize: 32, lineHeight: 40 }]}>
        SPR App is coming to your devices.
      </Text>
      <Text style={soonStyles.desc}>
        Take SPR with you wherever you manage, plan, and understand your money.
      </Text>
      <View style={[soonStyles.cardsRow, isMobile && soonStyles.cardsRowMobile]}>
        <View style={soonStyles.platformCard}>
          <Ionicons name="logo-apple" size={36} color="#FFF" />
          <View>
            <Text style={soonStyles.platformName}>iOS</Text>
            <Text style={soonStyles.platformStatus}>Coming Soon</Text>
          </View>
        </View>
        <View style={soonStyles.platformCard}>
          <Ionicons name="logo-google-playstore" size={32} color="#FFF" />
          <View>
            <Text style={soonStyles.platformName}>Android</Text>
            <Text style={soonStyles.platformStatus}>Coming Soon</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
const soonStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingTop: 100, paddingBottom: 40, backgroundColor: C.darkAlt, alignItems: 'center' },
  sectionMobile: { paddingTop: 80, paddingBottom: 40, paddingHorizontal: 24 },
  badge: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.cyan, marginBottom: 12, fontFamily: 'Inter' },
  heading: { fontSize: 40, fontWeight: '800', color: '#FFF', textAlign: 'center', marginBottom: 16, fontFamily: 'Inter' },
  desc: { fontSize: 18, color: C.slate400, textAlign: 'center', maxWidth: 600, marginBottom: 48, lineHeight: 28, fontFamily: 'Inter' },
  cardsRow: { flexDirection: 'row', gap: 24, justifyContent: 'center', flexWrap: 'wrap' },
  cardsRowMobile: { flexDirection: 'column', width: '100%' },
  platformCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', gap: 16, minWidth: 240, shadowColor: C.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 30 },
  platformName: { fontSize: 20, fontWeight: '700', color: '#FFF', fontFamily: 'Inter', marginBottom: 4 },
  platformStatus: { fontSize: 13, fontWeight: '600', color: C.slate400, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Closing CTA & Footer                                            */
/* ───────────────────────────────────────────────────────────────── */
function GetStarted({ isMobile }: { isMobile: boolean }) {
  return (
    <View style={ctaStyles.section}>
      <Text style={ctaStyles.heading}>Ready to understand your money differently?</Text>
      <Text style={ctaStyles.name}>SPR App</Text>
      <Text style={ctaStyles.fullName}>Student Pecuniary Routine App</Text>

      <View style={ctaStyles.builtBy}>
        <Text style={ctaStyles.builtByLabel}>Built by:</Text>
        <Text style={ctaStyles.builtByTeam}>Piggy Pockets</Text>
        <Text style={ctaStyles.builtBySchool}>Saipanyarangsit School · MEP Students</Text>
      </View>
    </View>
  );
}
const ctaStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingVertical: 100, backgroundColor: C.primary, alignItems: 'center' },
  heading: { fontSize: 40, fontWeight: '800', color: '#FFF', textAlign: 'center', maxWidth: 600, marginBottom: 40, fontFamily: 'Inter' },
  name: { fontSize: 24, fontWeight: '800', color: '#FFF', fontFamily: 'Inter', letterSpacing: 1, marginBottom: 8 },
  fullName: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter', marginBottom: 48 },
  builtBy: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', padding: 24, borderRadius: 16 },
  builtByLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'Inter' },
  builtByTeam: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 4, fontFamily: 'Inter' },
  builtBySchool: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter' },
});

function Footer({ isMobile, scrollTo }: { isMobile: boolean; scrollTo: (k: string) => void }) {
  const links = [
    { label: 'Why SPR', key: 'why' },
    { label: 'Features', key: 'features' },
    { label: 'Research', key: 'research' },
    { label: 'Team', key: 'team' },
    { label: 'Feedback', key: 'feedback' },
  ];

  return (
    <View style={footStyles.section}>
      <View style={[footStyles.top, isMobile && footStyles.topMobile]}>
        <View style={footStyles.brandCol}>
          <Text style={footStyles.brandName}>SPR App</Text>
          <Text style={footStyles.brandSub}>Student Pecuniary Routine App</Text>

          <View style={{ marginTop: 32 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFF', fontFamily: 'Inter', marginBottom: 4 }}>Piggy Pockets</Text>
            <Text style={{ fontSize: 13, color: C.slate400, fontFamily: 'Inter' }}>Saipanyarangsit School · MEP Students</Text>
          </View>
        </View>
        <View style={footStyles.linksCol}>
          {links.map((l) => (
            <Pressable key={l.key} onPress={() => scrollTo(l.key)}>
              <Text style={footStyles.linkText}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={footStyles.bottom}>
        <Text style={footStyles.copy}>© 2026 SPR App.</Text>
      </View>
    </View>
  );
}
const footStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingTop: 60, paddingBottom: 32, backgroundColor: C.darkAlt },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 48, marginBottom: 48 },
  topMobile: { flexDirection: 'column' },
  brandCol: { flex: 2 },
  brandName: { fontSize: 24, fontWeight: '800', color: '#FFF', fontFamily: 'Inter', marginBottom: 4 },
  brandSub: { fontSize: 14, color: C.slate400, fontFamily: 'Inter' },
  linksCol: { flex: 1, gap: 16 },
  linkText: { fontSize: 15, color: '#CBD5E1', fontFamily: 'Inter' },
  bottom: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 24, alignItems: 'center' },
  copy: { fontSize: 13, color: C.slate500, fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  App Mockup Helper                                               */
/* ───────────────────────────────────────────────────────────────── */
function AppMockup({ compact }: { compact?: boolean }) {
  const scale = compact ? 0.75 : 1;
  return (
    <View style={[mockStyles.phone, { transform: [{ scale }] }]}>
      <View style={mockStyles.statusBar}>
        <Text style={mockStyles.statusTime}>9:41</Text>
        <View style={mockStyles.notch} />
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <Ionicons name="cellular" size={12} color={C.dark} />
          <Ionicons name="wifi" size={12} color={C.dark} />
          <Ionicons name="battery-full" size={12} color={C.dark} />
        </View>
      </View>
      <View style={mockStyles.greeting}>
        <Text style={mockStyles.greetingSmall}>Good morning 👋</Text>
        <Text style={mockStyles.greetingName}>Student</Text>
      </View>
      <View style={mockStyles.balanceCard}>
        <Text style={mockStyles.balanceLabel}>Total Balance</Text>
        <Text style={mockStyles.balanceAmount}>฿2,450</Text>
        <View style={mockStyles.balanceRow}>
          <View style={mockStyles.balanceStat}>
            <Ionicons name="arrow-up" size={12} color="#10B981" />
            <Text style={[mockStyles.balanceStatText, { color: '#10B981' }]}>฿500</Text>
          </View>
          <View style={mockStyles.balanceStat}>
            <Ionicons name="arrow-down" size={12} color="#EF4444" />
            <Text style={[mockStyles.balanceStatText, { color: '#EF4444' }]}>฿280</Text>
          </View>
        </View>
      </View>
      <View style={mockStyles.limitCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={mockStyles.limitLabel}>Daily Limit</Text>
          <Text style={mockStyles.limitAmount}>฿85</Text>
        </View>
        <View style={mockStyles.limitBar}>
          <View style={[mockStyles.limitFill, { width: '45%' }]} />
        </View>
      </View>
      <View style={mockStyles.pigCard}>
        <Text style={{ fontSize: 24 }}>🐷</Text>
        <View style={{ flex: 1 }}>
          <Text style={mockStyles.pigLabel}>Saving Pig</Text>
          <Text style={mockStyles.pigAmount}>฿120 saved</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.slate400} />
      </View>
    </View>
  );
}
const mockStyles = StyleSheet.create({
  phone: { width: 280, backgroundColor: C.bg, borderRadius: 36, borderWidth: 3, borderColor: C.slate200, padding: 16, paddingTop: 8, boxShadow: '0 25px 60px rgba(37,99,235,0.15)' as any },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 16 },
  statusTime: { fontSize: 12, fontWeight: '600', color: C.dark },
  notch: { width: 80, height: 22, borderRadius: 20, backgroundColor: C.dark },
  greeting: { marginBottom: 16 },
  greetingSmall: { fontSize: 12, color: C.slate500, fontFamily: 'Inter' },
  greetingName: { fontSize: 20, fontWeight: '700', color: C.dark, fontFamily: 'Inter' },
  balanceCard: { backgroundColor: C.primary, borderRadius: 16, padding: 16, marginBottom: 10 },
  balanceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter' },
  balanceAmount: { fontSize: 24, fontWeight: '700', color: '#FFF', marginVertical: 4, fontFamily: 'Inter' },
  balanceRow: { flexDirection: 'row', gap: 16 },
  balanceStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceStatText: { fontSize: 11, fontWeight: '600' },
  limitCard: { backgroundColor: C.white, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.slate200 },
  limitLabel: { fontSize: 12, color: C.slate500, fontFamily: 'Inter' },
  limitAmount: { fontSize: 13, fontWeight: '600', color: C.primary, fontFamily: 'Inter' },
  limitBar: { height: 6, backgroundColor: C.slate100, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  limitFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  pigCard: { backgroundColor: C.white, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.slate200 },
  pigLabel: { fontSize: 12, fontWeight: '600', color: C.dark, fontFamily: 'Inter' },
  pigAmount: { fontSize: 11, color: C.slate500, fontFamily: 'Inter' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Global styles                                                   */
/* ───────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollRoot: { flex: 1 },
  rootContent: {
    ...(Platform.OS === 'web' ? { paddingTop: 70 } : {})
  },
});
