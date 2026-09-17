import { Colors } from '@/constants/theme';
import { LOCAL_API_URL } from '@/services/ai/client';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SurveyResults } from './SurveyResults';

/* ───────────────────────── colour tokens ───────────────────────── */
const C = {
  bg: '#F8FAFC',
  white: '#FFFFFF',
  dark: '#0F172A',
  slate700: '#334155',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  primary: Colors.light.primary,      // #6C63FF
  primaryDark: Colors.light.primaryDark, // #4F46E5
  primaryLight: '#EDE9FE',
  success: Colors.light.success,
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
      scrollRef.current.scrollTo({ y, animated: true });
    }
  }, []);

  const onLayout = useCallback((key: string, y: number) => {
    sectionRefs.current[key] = y;
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.root}
      contentContainerStyle={styles.rootContent}
    >
      <Navbar isMobile={isMobile} scrollTo={scrollTo} />
      <Hero isMobile={isMobile} isTablet={isTablet} scrollTo={scrollTo} />
      <View onLayout={(e) => onLayout('how', e.nativeEvent.layout.y)}>
        <HowItWorks isMobile={isMobile} />
      </View>
      <View onLayout={(e) => onLayout('features', e.nativeEvent.layout.y)}>
        <Features isMobile={isMobile} isTablet={isTablet} />
      </View>
      <View onLayout={(e) => onLayout('ai', e.nativeEvent.layout.y)}>
        <AISection isMobile={isMobile} />
      </View>
      <GoalsSimulator isMobile={isMobile} />
      <MenuScanner isMobile={isMobile} />
      <View onLayout={(e) => onLayout('research', e.nativeEvent.layout.y)}>
        <SurveyResults />
      </View>
      <View onLayout={(e) => onLayout('feedback', e.nativeEvent.layout.y)}>
        <WebFeedback isMobile={isMobile} />
      </View>
      <View onLayout={(e) => onLayout('cta', e.nativeEvent.layout.y)}>
        <GetStarted isMobile={isMobile} />
      </View>
      <Footer isMobile={isMobile} scrollTo={scrollTo} />
    </ScrollView>
  );
}

/* ───────────────────────────────────────────────────────────────── */
/*  Navbar                                                          */
/* ───────────────────────────────────────────────────────────────── */
function Navbar({ isMobile, scrollTo }: { isMobile: boolean; scrollTo: (k: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { label: 'Features', key: 'features' },
    { label: 'How It Works', key: 'how' },
    { label: 'Research', key: 'research' },
    { label: 'Feedback', key: 'feedback' },
  ];

  return (
    <View style={[navStyles.bar, isMobile && navStyles.barMobile]}>
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
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '8%' as any,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: C.slate200,
    zIndex: 100,
  },
  barMobile: { paddingHorizontal: 20, flexWrap: 'wrap' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#FFF', fontWeight: '700', fontSize: 18 },
  brandName: { fontSize: 20, fontWeight: '700', color: C.dark },
  hamburger: { padding: 6 },
  mobileMenu: {
    width: '100%',
    paddingTop: 16,
    gap: 4,
  },
  mobileLink: { paddingVertical: 12, paddingHorizontal: 8 },
  mobileLinkText: { fontSize: 16, fontWeight: '500', color: C.slate700 },
  mobileCta: {
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  mobileCtaText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  desktopLinks: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  desktopLinkText: { fontSize: 15, fontWeight: '500', color: C.slate700 },
  desktopCta: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  desktopCtaText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Hero                                                            */
/* ───────────────────────────────────────────────────────────────── */
function Hero({
  isMobile,
  isTablet,
  scrollTo,
}: {
  isMobile: boolean;
  isTablet: boolean;
  scrollTo: (k: string) => void;
}) {
  return (
    <View style={[heroStyles.wrap, isMobile && heroStyles.wrapMobile]}>
      {/* left text */}
      <View style={[heroStyles.text, isMobile && heroStyles.textMobile]}>
        <Text style={heroStyles.badge}>SPR APP</Text>
        <Text style={[heroStyles.heading, isMobile && heroStyles.headingMobile]}>
          Understand your money.{'\n'}Spend smarter.{'\n'}Reach your goals.
        </Text>
        <Text style={[heroStyles.sub, isMobile && heroStyles.subMobile]}>
          SPR App helps students manage spending, savings, goals, and everyday financial decisions with real financial tracking and AI-assisted guidance.
        </Text>

        <View style={heroStyles.ctas}>
          <Pressable
            style={heroStyles.primaryBtn}
            onPress={() => scrollTo('cta')}
            accessibilityRole="button"
          >
            <Text style={heroStyles.primaryBtnText}>Get SPR App</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </Pressable>
          <Pressable
            style={heroStyles.secondaryBtn}
            onPress={() => scrollTo('how')}
            accessibilityRole="button"
          >
            <Text style={heroStyles.secondaryBtnText}>See How It Works</Text>
          </Pressable>
        </View>

        <Text style={heroStyles.tagline}>Student Pecuniary Routine App</Text>
      </View>

      {/* right mockup */}
      {!isMobile && (
        <View style={heroStyles.mockupArea}>
          <AppMockup compact={isTablet} />
        </View>
      )}
    </View>
  );
}

/* A lightweight CSS-only "phone" showing real feature cards */
function AppMockup({ compact }: { compact?: boolean }) {
  const scale = compact ? 0.75 : 1;
  return (
    <View style={[mockStyles.phone, { transform: [{ scale }] }]}>
      {/* status bar */}
      <View style={mockStyles.statusBar}>
        <Text style={mockStyles.statusTime}>9:41</Text>
        <View style={mockStyles.notch} />
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <Ionicons name="cellular" size={12} color={C.dark} />
          <Ionicons name="wifi" size={12} color={C.dark} />
          <Ionicons name="battery-full" size={12} color={C.dark} />
        </View>
      </View>

      {/* greeting */}
      <View style={mockStyles.greeting}>
        <Text style={mockStyles.greetingSmall}>Good morning 👋</Text>
        <Text style={mockStyles.greetingName}>Student</Text>
      </View>

      {/* balance card */}
      <View style={mockStyles.balanceCard}>
        <Text style={mockStyles.balanceLabel}>Total Balance</Text>
        <Text style={mockStyles.balanceAmount}>₫2,450,000</Text>
        <View style={mockStyles.balanceRow}>
          <View style={mockStyles.balanceStat}>
            <Ionicons name="arrow-up" size={12} color="#10B981" />
            <Text style={[mockStyles.balanceStatText, { color: '#10B981' }]}>₫500,000</Text>
          </View>
          <View style={mockStyles.balanceStat}>
            <Ionicons name="arrow-down" size={12} color="#EF4444" />
            <Text style={[mockStyles.balanceStatText, { color: '#EF4444' }]}>₫280,000</Text>
          </View>
        </View>
      </View>

      {/* daily limit */}
      <View style={mockStyles.limitCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={mockStyles.limitLabel}>Daily Limit</Text>
          <Text style={mockStyles.limitAmount}>₫85,000</Text>
        </View>
        <View style={mockStyles.limitBar}>
          <View style={[mockStyles.limitFill, { width: '45%' }]} />
        </View>
      </View>

      {/* saving pig */}
      <View style={mockStyles.pigCard}>
        <Text style={{ fontSize: 24 }}>🐷</Text>
        <View style={{ flex: 1 }}>
          <Text style={mockStyles.pigLabel}>Saving Pig</Text>
          <Text style={mockStyles.pigAmount}>₫120,000 saved</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.slate400} />
      </View>
    </View>
  );
}

const mockStyles = StyleSheet.create({
  phone: {
    width: 280,
    backgroundColor: C.bg,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: C.slate200,
    padding: 16,
    paddingTop: 8,
    boxShadow: '0 25px 60px rgba(108,99,255,0.15)' as any,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  statusTime: { fontSize: 12, fontWeight: '600', color: C.dark },
  notch: {
    width: 80,
    height: 22,
    borderRadius: 20,
    backgroundColor: C.dark,
  },
  greeting: { marginBottom: 16 },
  greetingSmall: { fontSize: 12, color: C.slate500 },
  greetingName: { fontSize: 20, fontWeight: '700', color: C.dark },
  balanceCard: {
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  balanceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { fontSize: 24, fontWeight: '700', color: '#FFF', marginVertical: 4 },
  balanceRow: { flexDirection: 'row', gap: 16 },
  balanceStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceStatText: { fontSize: 11, fontWeight: '600' },
  limitCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.slate200,
  },
  limitLabel: { fontSize: 12, color: C.slate500 },
  limitAmount: { fontSize: 13, fontWeight: '600', color: C.primary },
  limitBar: {
    height: 6,
    backgroundColor: C.slate100,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  limitFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  pigCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: C.slate200,
  },
  pigLabel: { fontSize: 12, fontWeight: '600', color: C.dark },
  pigAmount: { fontSize: 11, color: C.slate500 },
});

const heroStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '8%' as any,
    paddingTop: 80,
    paddingBottom: 80,
    backgroundColor: C.white,
  },
  wrapMobile: {
    flexDirection: 'column',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 48,
  },
  text: { flex: 1, maxWidth: 580 },
  textMobile: { maxWidth: '100%' as any },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.primary,
    marginBottom: 16,
  },
  heading: {
    fontSize: 48,
    fontWeight: '800',
    color: C.dark,
    lineHeight: 56,
    marginBottom: 20,
  },
  headingMobile: { fontSize: 32, lineHeight: 40 },
  sub: {
    fontSize: 18,
    color: C.slate500,
    lineHeight: 28,
    marginBottom: 32,
  },
  subMobile: { fontSize: 16, lineHeight: 24 },
  ctas: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  secondaryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.slate200,
  },
  secondaryBtnText: { color: C.slate700, fontWeight: '600', fontSize: 16 },
  tagline: { fontSize: 13, color: C.slate400, fontStyle: 'italic' },
  mockupArea: { marginLeft: 40 },
});

/* ───────────────────────────────────────────────────────────────── */
/*  How It Works                                                    */
/* ───────────────────────────────────────────────────────────────── */
function HowItWorks({ isMobile }: { isMobile: boolean }) {
  const steps = [
    {
      num: '01',
      icon: 'receipt-outline' as const,
      title: 'Track',
      desc: 'Record your income and expenses. Every transaction builds a picture of your real financial life.',
      color: C.primary,
    },
    {
      num: '02',
      icon: 'analytics-outline' as const,
      title: 'Understand',
      desc: 'See spending patterns, daily limits, and goal progress. Know exactly where your money goes.',
      color: C.success,
    },
    {
      num: '03',
      icon: 'bulb-outline' as const,
      title: 'Decide',
      desc: 'Use the spending simulator and AI guidance before making purchases. Make every decision count.',
      color: C.warning,
    },
  ];

  return (
    <View style={howStyles.section}>
      <Text style={howStyles.label}>HOW IT WORKS</Text>
      <Text style={[howStyles.heading, isMobile && { fontSize: 28, lineHeight: 36 }]}>
        Three steps to better money habits
      </Text>
      <View style={[howStyles.grid, isMobile && howStyles.gridMobile]}>
        {steps.map((s) => (
          <View key={s.num} style={[howStyles.card, isMobile && howStyles.cardMobile]}>
            <View style={[howStyles.iconCircle, { backgroundColor: s.color + '15' }]}>
              <Ionicons name={s.icon} size={28} color={s.color} />
            </View>
            <Text style={howStyles.stepNum}>{s.num}</Text>
            <Text style={howStyles.stepTitle}>{s.title}</Text>
            <Text style={howStyles.stepDesc}>{s.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const howStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingVertical: 80, backgroundColor: C.bg },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.primary, textAlign: 'center', marginBottom: 12 },
  heading: { fontSize: 36, fontWeight: '800', color: C.dark, textAlign: 'center', marginBottom: 48, lineHeight: 44 },
  grid: { flexDirection: 'row', gap: 24, justifyContent: 'center' },
  gridMobile: { flexDirection: 'column' },
  card: {
    flex: 1,
    minWidth: 260,
    maxWidth: 360,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: C.slate200,
  },
  cardMobile: { maxWidth: '100%' as any },
  iconCircle: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stepNum: { fontSize: 13, fontWeight: '700', color: C.primary, marginBottom: 6 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: C.dark, marginBottom: 8 },
  stepDesc: { fontSize: 15, color: C.slate500, lineHeight: 24 },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Features                                                        */
/* ───────────────────────────────────────────────────────────────── */
function Features({ isMobile, isTablet }: { isMobile: boolean; isTablet: boolean }) {
  const features = [
    { icon: 'speedometer-outline', title: 'Daily Spending Limit', desc: 'Know how much you can spend each day based on your real balance and goals.', color: C.primary },
    { icon: 'swap-vertical-outline', title: 'Transaction Tracking', desc: 'Record every income and expense. Build a clear picture of your financial life.', color: '#0EA5E9' },
    { icon: 'save-outline', title: 'Saving Pig', desc: 'Watch your savings grow with a visual, motivating savings companion.', color: '#EC4899' },
    { icon: 'flag-outline', title: 'Savings Goals', desc: 'Set targets for things you want. Track progress automatically as you save.', color: C.success },
    { icon: 'calculator-outline', title: 'Spending Simulator', desc: 'Test a purchase before you make it. See how it affects your balance and goals.', color: C.warning },
    { icon: 'sparkles-outline', title: 'AI Financial Assistant', desc: 'Ask questions about your spending and get guidance based on your real data.', color: '#8B5CF6' },
    { icon: 'camera-outline', title: 'Menu Scanner', desc: 'Scan restaurant menus and compare choices against your budget.', color: '#F97316' },
  ];

  return (
    <View style={featStyles.section}>
      <Text style={featStyles.label}>FEATURES</Text>
      <Text style={[featStyles.heading, isMobile && { fontSize: 28, lineHeight: 36 }]}>
        Everything you need to master your money
      </Text>
      <View style={[featStyles.grid, isMobile && featStyles.gridMobile, isTablet && { gap: 16 }]}>
        {features.map((f) => (
          <View key={f.title} style={[featStyles.card, isMobile && featStyles.cardMobile]}>
            <View style={[featStyles.iconBox, { backgroundColor: f.color + '12' }]}>
              <Ionicons name={f.icon as any} size={24} color={f.color} />
            </View>
            <Text style={featStyles.cardTitle}>{f.title}</Text>
            <Text style={featStyles.cardDesc}>{f.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const featStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingVertical: 80, backgroundColor: C.white },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.primary, textAlign: 'center', marginBottom: 12 },
  heading: { fontSize: 36, fontWeight: '800', color: C.dark, textAlign: 'center', marginBottom: 48, lineHeight: 44 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center' },
  gridMobile: { flexDirection: 'column' },
  card: {
    width: '30%' as any,
    minWidth: 260,
    backgroundColor: C.bg,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: C.slate200,
  },
  cardMobile: { width: '100%' as any },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: C.dark, marginBottom: 6 },
  cardDesc: { fontSize: 14, color: C.slate500, lineHeight: 22 },
});

/* ───────────────────────────────────────────────────────────────── */
/*  AI Assistant Section                                            */
/* ───────────────────────────────────────────────────────────────── */
function AISection({ isMobile }: { isMobile: boolean }) {
  const prompts = [
    { q: 'Can I afford this?', icon: 'help-circle-outline' },
    { q: 'How much should I save this month?', icon: 'trending-up-outline' },
    { q: 'Can I buy this and still reach my goal?', icon: 'flag-outline' },
    { q: 'Why am I spending so much on food?', icon: 'restaurant-outline' },
  ];

  return (
    <View style={[aiStyles.section, isMobile && aiStyles.sectionMobile]}>
      <View style={[aiStyles.left, isMobile && aiStyles.leftMobile]}>
        <Text style={aiStyles.label}>AI ASSISTANT</Text>
        <Text style={[aiStyles.heading, isMobile && { fontSize: 28, lineHeight: 36 }]}>
          Your personal financial advisor
        </Text>
        <Text style={aiStyles.desc}>
          Ask real questions about your money. SPR App's AI uses your actual spending, balance, and goals to give personalised guidance — not generic tips.
        </Text>
      </View>

      <View style={[aiStyles.right, isMobile && aiStyles.rightMobile]}>
        {/* chat mockup */}
        <View style={aiStyles.chatBox}>
          <View style={aiStyles.chatHeader}>
            <View style={aiStyles.chatDot} />
            <Text style={aiStyles.chatHeaderText}>Example Prompts</Text>
          </View>
          {prompts.map((p) => (
            <View key={p.q} style={aiStyles.promptRow}>
              <Ionicons name={p.icon as any} size={18} color={C.primary} />
              <Text style={aiStyles.promptText}>"{p.q}"</Text>
            </View>
          ))}
          <Text style={aiStyles.chatNote}>
            Responses are generated from your real account data.
          </Text>
        </View>
      </View>
    </View>
  );
}

const aiStyles = StyleSheet.create({
  section: {
    flexDirection: 'row',
    paddingHorizontal: '8%' as any,
    paddingVertical: 80,
    backgroundColor: C.bg,
    gap: 48,
    alignItems: 'center',
  },
  sectionMobile: { flexDirection: 'column', paddingHorizontal: 24 },
  left: { flex: 1, maxWidth: 460 },
  leftMobile: { maxWidth: '100%' as any },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.primary, marginBottom: 12 },
  heading: { fontSize: 32, fontWeight: '800', color: C.dark, lineHeight: 40, marginBottom: 16 },
  desc: { fontSize: 16, color: C.slate500, lineHeight: 26 },
  right: { flex: 1, alignItems: 'center' },
  rightMobile: { width: '100%' as any },
  chatBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.slate200,
  },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  chatDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.success },
  chatHeaderText: { fontSize: 14, fontWeight: '600', color: C.dark },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: C.bg,
    borderRadius: 12,
    marginBottom: 8,
  },
  promptText: { fontSize: 14, color: C.slate700, fontStyle: 'italic', flex: 1 },
  chatNote: { fontSize: 12, color: C.slate400, marginTop: 12, textAlign: 'center', fontStyle: 'italic' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Goals & Simulator                                               */
/* ───────────────────────────────────────────────────────────────── */
function GoalsSimulator({ isMobile }: { isMobile: boolean }) {
  return (
    <View style={[gsStyles.section, isMobile && gsStyles.sectionMobile]}>
      {/* visual flow */}
      <View style={[gsStyles.flowBox, isMobile && gsStyles.flowBoxMobile]}>
        <View style={gsStyles.flowStep}>
          <View style={[gsStyles.flowIcon, { backgroundColor: C.primary + '15' }]}>
            <Ionicons name="wallet-outline" size={24} color={C.primary} />
          </View>
          <Text style={gsStyles.flowLabel}>Your Balance</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={C.slate400} />
        <View style={gsStyles.flowStep}>
          <View style={[gsStyles.flowIcon, { backgroundColor: C.warning + '15' }]}>
            <Ionicons name="calculator-outline" size={24} color={C.warning} />
          </View>
          <Text style={gsStyles.flowLabel}>Simulate</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={C.slate400} />
        <View style={gsStyles.flowStep}>
          <View style={[gsStyles.flowIcon, { backgroundColor: C.success + '15' }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color={C.success} />
          </View>
          <Text style={gsStyles.flowLabel}>See Impact</Text>
        </View>
      </View>

      <View style={[gsStyles.textBox, isMobile && gsStyles.textBoxMobile]}>
        <Text style={gsStyles.label}>GOALS & SIMULATOR</Text>
        <Text style={[gsStyles.heading, isMobile && { fontSize: 28, lineHeight: 36 }]}>
          Test before you spend
        </Text>
        <Text style={gsStyles.desc}>
          Set savings goals and use the spending simulator to see how a purchase affects your balance, daily limit, and goal progress — before you commit.
        </Text>
      </View>
    </View>
  );
}

const gsStyles = StyleSheet.create({
  section: {
    flexDirection: 'row',
    paddingHorizontal: '8%' as any,
    paddingVertical: 80,
    backgroundColor: C.white,
    gap: 48,
    alignItems: 'center',
  },
  sectionMobile: { flexDirection: 'column', paddingHorizontal: 24 },
  flowBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  flowBoxMobile: { marginBottom: 24 },
  flowStep: { alignItems: 'center', gap: 8 },
  flowIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flowLabel: { fontSize: 13, fontWeight: '600', color: C.slate700 },
  textBox: { flex: 1, maxWidth: 460 },
  textBoxMobile: { maxWidth: '100%' as any },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.primary, marginBottom: 12 },
  heading: { fontSize: 32, fontWeight: '800', color: C.dark, lineHeight: 40, marginBottom: 16 },
  desc: { fontSize: 16, color: C.slate500, lineHeight: 26 },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Menu Scanner                                                    */
/* ───────────────────────────────────────────────────────────────── */
function MenuScanner({ isMobile }: { isMobile: boolean }) {
  const steps = [
    { icon: 'camera-outline', label: 'Photo', desc: 'Take a photo of a menu' },
    { icon: 'scan-outline', label: 'OCR', desc: 'Text is extracted automatically' },
    { icon: 'create-outline', label: 'Review', desc: 'Edit detected items and prices' },
    { icon: 'cash-outline', label: 'Compare', desc: 'See how each choice fits your budget' },
  ];

  return (
    <View style={scanStyles.section}>
      <Text style={scanStyles.label}>MENU SCANNER</Text>
      <Text style={[scanStyles.heading, isMobile && { fontSize: 28, lineHeight: 36 }]}>
        Scan menus. Make smarter choices.
      </Text>
      <Text style={scanStyles.desc}>
        Point your camera at a restaurant menu. SPR App detects items and helps you compare choices against your current budget.
      </Text>
      <View style={[scanStyles.steps, isMobile && scanStyles.stepsMobile]}>
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <View style={[scanStyles.stepCard, isMobile && scanStyles.stepCardMobile]}>
              <View style={scanStyles.stepIcon}>
                <Ionicons name={s.icon as any} size={24} color={C.primary} />
              </View>
              <Text style={scanStyles.stepLabel}>{s.label}</Text>
              <Text style={scanStyles.stepDesc}>{s.desc}</Text>
            </View>
            {i < steps.length - 1 && !isMobile && (
              <Ionicons name="arrow-forward" size={20} color={C.slate400} style={{ marginTop: 24 }} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const scanStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingVertical: 80, backgroundColor: C.bg, alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.primary, marginBottom: 12 },
  heading: { fontSize: 36, fontWeight: '800', color: C.dark, textAlign: 'center', marginBottom: 12, lineHeight: 44 },
  desc: { fontSize: 16, color: C.slate500, textAlign: 'center', maxWidth: 560, marginBottom: 40, lineHeight: 26 },
  steps: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' },
  stepsMobile: { flexDirection: 'column', alignItems: 'stretch' },
  stepCard: {
    width: 180,
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.slate200,
  },
  stepCardMobile: { width: '100%' as any, flexDirection: 'row', gap: 16, alignItems: 'center' as any },
  stepIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  stepLabel: { fontSize: 15, fontWeight: '700', color: C.dark, marginBottom: 4 },
  stepDesc: { fontSize: 13, color: C.slate500, textAlign: 'center', lineHeight: 20 },
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
    if (!message.trim()) {
      setError('Please enter your feedback message.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${LOCAL_API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          contact_email: email,
          platform: 'web',
          app_version: 'landing',
        }),
      });
      if (response.ok) {
        setSuccess(true);
        setMessage('');
        setEmail('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit feedback. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const types = ['feature', 'bug', 'other'] as const;

  return (
    <View style={fbStyles.section}>
      <Text style={fbStyles.label}>FEEDBACK</Text>
      <Text style={[fbStyles.heading, isMobile && { fontSize: 28, lineHeight: 36 }]}>
        Help us improve SPR App
      </Text>
      <Text style={fbStyles.desc}>
        Found something confusing? Have an idea? Tell us.
      </Text>

      <View style={[fbStyles.form, isMobile && fbStyles.formMobile]}>
        {success ? (
          <View style={fbStyles.successBox}>
            <Ionicons name="checkmark-circle" size={56} color={C.success} />
            <Text style={fbStyles.successTitle}>Thank you!</Text>
            <Text style={fbStyles.successDesc}>
              Your feedback helps us make SPR App better for everyone.
            </Text>
            <Pressable style={fbStyles.btn} onPress={() => setSuccess(false)}>
              <Text style={fbStyles.btnText}>Send More Feedback</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={fbStyles.fieldLabel}>Category</Text>
            <View style={fbStyles.typeRow} accessibilityRole="radiogroup">
              {types.map((t) => (
                <Pressable
                  key={t}
                  style={[fbStyles.typeBtn, type === t && fbStyles.typeBtnActive]}
                  onPress={() => setType(t)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: type === t }}
                >
                  <Text style={[fbStyles.typeText, type === t && fbStyles.typeTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={fbStyles.fieldLabel}>Message</Text>
            {/* @ts-ignore web textarea */}
            <textarea
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 10,
                border: `1px solid ${C.slate200}`,
                fontSize: 15,
                minHeight: 120,
                fontFamily: 'inherit',
                resize: 'vertical' as any,
                outlineStyle: 'none',
              } as any}
              placeholder="Tell us what you think..."
              value={message}
              onChange={(e: any) => setMessage(e.target.value)}
            />

            <Text style={fbStyles.fieldLabel}>Email (optional)</Text>
            {/* @ts-ignore web input */}
            <input
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 10,
                border: `1px solid ${C.slate200}`,
                fontSize: 15,
                outlineStyle: 'none',
              } as any}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
            />

            {error ? <Text style={fbStyles.errorText}>{error}</Text> : null}

            <Pressable
              style={[fbStyles.btn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={fbStyles.btnText}>Submit Feedback</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const fbStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingVertical: 80, backgroundColor: C.white, alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.primary, marginBottom: 12 },
  heading: { fontSize: 36, fontWeight: '800', color: C.dark, textAlign: 'center', marginBottom: 8, lineHeight: 44 },
  desc: { fontSize: 16, color: C.slate500, textAlign: 'center', marginBottom: 32 },
  form: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: C.bg,
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: C.slate200,
  },
  formMobile: { padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.slate700, marginBottom: 6, marginTop: 16 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.slate200,
    backgroundColor: C.white,
  },
  typeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  typeText: { fontSize: 14, fontWeight: '500', color: C.slate500 },
  typeTextActive: { color: '#FFF' },
  btn: {
    backgroundColor: C.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  errorText: { color: C.danger, fontSize: 13, marginTop: 8 },
  successBox: { alignItems: 'center', paddingVertical: 32 },
  successTitle: { fontSize: 24, fontWeight: '700', color: C.dark, marginTop: 12, marginBottom: 8 },
  successDesc: { fontSize: 15, color: C.slate500, textAlign: 'center', marginBottom: 24 },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Get Started CTA                                                 */
/* ───────────────────────────────────────────────────────────────── */
function GetStarted({ isMobile }: { isMobile: boolean }) {
  return (
    <View style={ctaStyles.section}>
      <View style={ctaStyles.inner}>
        <Text style={[ctaStyles.heading, isMobile && { fontSize: 28, lineHeight: 36 }]}>
          Start building better money habits
        </Text>
        <Text style={ctaStyles.desc}>
          SPR App is designed for students who want to understand their spending, set savings goals, and make smarter financial decisions every day.
        </Text>

        <View style={ctaStyles.buttons}>
          <Pressable style={ctaStyles.storeBtn} onPress={() => alert('Google Play — Coming Soon!')}>
            <Ionicons name="logo-google-playstore" size={22} color="#FFF" />
            <View>
              <Text style={ctaStyles.storeBtnSmall}>GET IT ON</Text>
              <Text style={ctaStyles.storeBtnLarge}>Google Play</Text>
            </View>
          </Pressable>
          <Pressable style={ctaStyles.storeBtn} onPress={() => alert('App Store — Coming Soon!')}>
            <Ionicons name="logo-apple" size={22} color="#FFF" />
            <View>
              <Text style={ctaStyles.storeBtnSmall}>Download on the</Text>
              <Text style={ctaStyles.storeBtnLarge}>App Store</Text>
            </View>
          </Pressable>
        </View>

        <Text style={ctaStyles.comingSoon}>Coming Soon</Text>
      </View>
    </View>
  );
}

const ctaStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingVertical: 80, backgroundColor: C.primary },
  inner: { alignItems: 'center' },
  heading: { fontSize: 36, fontWeight: '800', color: '#FFF', textAlign: 'center', lineHeight: 44, marginBottom: 16 },
  desc: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', maxWidth: 520, lineHeight: 26, marginBottom: 32 },
  buttons: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  storeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  storeBtnSmall: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '500' },
  storeBtnLarge: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  comingSoon: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 16, fontStyle: 'italic' },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Footer                                                          */
/* ───────────────────────────────────────────────────────────────── */
function Footer({ isMobile, scrollTo }: { isMobile: boolean; scrollTo: (k: string) => void }) {
  const links = [
    { label: 'Features', key: 'features' },
    { label: 'How It Works', key: 'how' },
    { label: 'Research', key: 'research' },
    { label: 'Feedback', key: 'feedback' },
  ];

  return (
    <View style={footStyles.section}>
      <View style={[footStyles.top, isMobile && footStyles.topMobile]}>
        <View style={footStyles.brandCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <View style={navStyles.logoCircle}>
              <Text style={navStyles.logoText}>S</Text>
            </View>
            <Text style={footStyles.brandName}>SPR App</Text>
          </View>
          <Text style={footStyles.brandSub}>Student Pecuniary Routine App</Text>
          <Text style={footStyles.brandDesc}>
            Helping students build better money habits through tracking, simulation, and AI-assisted guidance.
          </Text>
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 12, color: C.slate500, marginBottom: 4 }}>Built by</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFF' }}>Piggy Pockets</Text>
            <Text style={{ fontSize: 13, color: C.slate400 }}>Saipanyarangsit School · MEP Students</Text>
          </View>
        </View>

        <View style={footStyles.linksCol}>
          <Text style={footStyles.linksTitle}>Quick Links</Text>
          {links.map((l) => (
            <Pressable key={l.key} onPress={() => scrollTo(l.key)} accessibilityRole="link">
              <Text style={footStyles.linkText}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={footStyles.bottom}>
        <Text style={footStyles.copy}>© 2026 SPR App. Built for students, by students.</Text>
      </View>
    </View>
  );
}

const footStyles = StyleSheet.create({
  section: { paddingHorizontal: '8%' as any, paddingTop: 48, paddingBottom: 24, backgroundColor: C.dark },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 48, marginBottom: 32 },
  topMobile: { flexDirection: 'column' },
  brandCol: { flex: 2 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  brandSub: { fontSize: 13, color: C.slate400, marginBottom: 8 },
  brandDesc: { fontSize: 14, color: C.slate500, lineHeight: 22, maxWidth: 340 },
  linksCol: { flex: 1 },
  linksTitle: { fontSize: 14, fontWeight: '600', color: C.slate400, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  linkText: { fontSize: 15, color: '#CBD5E1', paddingVertical: 6 },
  bottom: { borderTopWidth: 1, borderTopColor: '#1E293B', paddingTop: 20, alignItems: 'center' },
  copy: { fontSize: 13, color: C.slate500 },
});

/* ───────────────────────────────────────────────────────────────── */
/*  Global styles                                                   */
/* ───────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  rootContent: {},
});
