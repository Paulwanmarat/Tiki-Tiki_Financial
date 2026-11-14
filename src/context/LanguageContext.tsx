import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import { getTokenSafe, setTokenSafe } from '@/utils/storage';

export type Language = 'en' | 'th';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const LANGUAGE_STORAGE_KEY = 'spr_app_language';

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.problem': 'The Problem',
    'nav.ledger': '3-Pillars',
    'nav.ecosystem': 'Ecosystem',
    'nav.simulator': 'Simulator',
    'nav.piggyVault': 'Piggy Vault',
    'nav.survey': 'MEP Survey',
    'nav.team': 'Team',
    'nav.liveImpact': 'Live Impact',
    'nav.marketplace': 'Marketplace',
    'nav.donate': 'Donate & Causes',
    'nav.projects': 'SPR Projects',
    'nav.openWebApp': 'Open App',
    'nav.launchStudio': 'Launch SPR Web App',

    // Hero & Brand
    'brand.title': 'SPR MONEY STUDIO',
    'brand.tagline': 'Student Pecuniary Routine',
    'hero.badge': 'Saipanyarangsit MEP Edition · 2026',
    'hero.yourMoney': 'Your money.',
    'hero.yourCanvas': 'Your canvas.',
    'hero.title': 'Smart Pecuniary Routine for Modern Students',
    'hero.subhead': 'Students don’t need complicated corporate banking tools. SPR is a tactile, creative financial studio designed to reveal where daily cash evaporates, simulate purchases before tapping pay, and transform spare bahts into real goals.',
    'hero.simulateContext': 'SIMULATE REAL STUDENT CONTEXT:',
    'hero.modeCampus': '[ 01 · CAMPUS ROUTINE ]',
    'hero.modeResearch': '[ 02 · RESEARCH LAB ]',
    'hero.launchBtn': 'Launch Web App',
    'hero.simulatorBtn': 'Try Spending Simulator',
    'hero.advisedBy': 'Saipanyarangsit MEP Project · Advised by',
    'hero.sessionCampus': 'SESSION 01 · MON-FRI CAMPUS LEDGER',
    'hero.sessionResearch': 'SESSION 02 · RESEARCH LAB SESSION',
    'hero.dailyBudget': 'DAILY BUDGET',
    'hero.spent': 'SPENT',
    'hero.remaining': 'REMAINING',
    'hero.safeOnTrack': 'SAFE · ON TRACK',
    'hero.safeProject': 'SAFE · PROJECT COVERED',

    // Stats / App Usage
    'stats.totalUsers': 'Total Registered Students & Users',
    'stats.dailyActive': 'Daily Active Allowance Budgeters',
    'stats.dailyTransactions': 'Daily Transactions Logged Today',
    'stats.totalTransactions': 'Total Pecuniary Transactions Logged',
    'stats.activeGoals': 'Active Student Savings Goals',
    'stats.auditHeading': 'Campus Mutual Aid & Daily Routine Stats',
    'stats.auditSub': 'Live database metrics retrieved directly from our PostgreSQL ledger.',
    'stats.counterStudents': 'Registered Students',
    'stats.counterBudgeters': 'Daily Active Budgeters',
    'stats.counterTxns': 'Total Transactions',

    // Problem Section
    'problem.badge': 'THE PROBLEM · MEP SURVEY DATA',
    'problem.title': 'Where Does Daily Student Cash Disappear?',
    'problem.subhead': 'Through our empirical survey across Saipanyarangsit MEP classrooms, we discovered three core friction points in student financial routines.',
    'problem.card1Title': 'Daily Canteen Cash Leaks',
    'problem.card1Desc': 'Unplanned afternoon snacks, drinks, and bubble teas slowly deplete student weekly allowances without realization.',
    'problem.card2Title': 'No Pre-Purchase Simulation',
    'problem.card2Desc': 'Decisions happen impulsively at payment counters before checking whether remaining funds cover transit and school supplies.',
    'problem.card3Title': 'Isolated Peer Emergencies',
    'problem.card3Desc': 'When students face unexpected school project supply costs or bill shortages, mutual aid options are fragmented and opaque.',

    // 3-Pillar Ledger
    'pillars.badge': 'THE ARCHITECTURE',
    'pillars.title': 'The 3-Pillar Student Ledger',
    'pillars.subhead': 'SPR re-engineers accounting into three tactile rituals built for the daily student lifestyle.',
    'pillars.p1Title': 'Daily Allowance Allocation',
    'pillars.p1Desc': 'Automatically computes safe daily spending allowances based on your weekly pocket money and recurring lunch routine.',
    'pillars.p2Title': 'Purchase Simulation',
    'pillars.p2Desc': 'Simulate canteen lunches or stationery costs before purchasing to visualize remaining funds and savings trajectory.',
    'pillars.p3Title': 'Piggy Vault Milestone Savings',
    'pillars.p3Desc': 'Lock spare lunch bahts into visual savings goals with real-time percentage progress and interactive milestone feedback.',

    // Mutual Aid Ecosystem
    'ecosystem.badge': 'CAMPUS MUTUAL AID',
    'ecosystem.title': 'An Ecosystem Built for Real Community Impact',
    'ecosystem.subhead': 'Transparent verified funding channels connecting students, school projects, and environmental stewardship.',
    'ecosystem.tryland': 'TRYLAND (Trees & Ecology)',
    'ecosystem.trylandDesc': 'Plant campus and community trees to offset environmental carbon footprint, verified transparently on-chain and in ledger.',
    'ecosystem.rk': 'RK (Random Kindness)',
    'ecosystem.rkDesc': 'Anonymous peer assistance for genuine student meal, uniform, and classroom project cost relief.',
    'ecosystem.donate': 'SPR Donate Campaigns',
    'ecosystem.donateDesc': 'Community-driven educational equipment funding for school laboratory and digital learning tools.',

    // Spending Simulator
    'simulator.badge': 'TACTILE SPENDING SIMULATOR',
    'simulator.title': 'Test The Financial Impact Before You Pay',
    'simulator.subhead': 'See how today’s purchase affects tomorrow’s canteen budget and your long-term savings goals.',

    // Visual Piggy Vault
    'piggy.badge': 'VISUAL SAVINGS PIG',
    'piggy.title': 'Watch Your Goals Grow in Real Baht',
    'piggy.subhead': 'Every baht saved fills your interactive digital piggy bank with real progress milestones.',

    // Auth
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.welcomeBack': 'Welcome Back',
    'auth.signInSub': 'Sign in to manage your daily student allowance & goals',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.loginBtn': 'Sign In to Studio',
    'auth.createAccount': 'Create Account',
    'auth.orContinueWith': 'OR CONTINUE WITH',
    'auth.continueGoogle': 'Continue with Google',

    // Settings & Actions
    'settings.language': 'LANGUAGE / ภาษา',
    'settings.theme': 'APP APPEARANCE & THEME',
    'settings.logOut': 'Log Out',
    'settings.back': 'Back',

    // Metrics
    'metrics.verifiedTransfers': 'Total Verified Transfers',
    'metrics.verifiedTransfersSub': 'Bank receipts checked & approved',
    'metrics.billsFunded': 'Student Bills Fully Funded',
    'metrics.billsFundedSub': '100% relief delivered to peers',
    'metrics.causesReached': 'Campus Causes Reached',
    'metrics.causesReachedSub': 'Goals successfully achieved',

    // Footer
    'footer.rights': 'Team Piggy Pockets · Saipanyarangsit MEP. All rights reserved.',
    'footer.privacy': 'Data Practice: Student pecuniary data is stored with encrypted identifiers and never sold.',
    'footer.advisor': 'Project Advisor: Mr. Anthony Jose B. Ferrer',
    'footer.school': 'Saipanyarangsit School · Mini English Program (MEP)',
  },
  th: {
    // Navigation
    'nav.home': 'หน้าแรก',
    'nav.problem': 'ปัญหาการเงิน',
    'nav.ledger': '3 เสาหลัก',
    'nav.ecosystem': 'ระบบนิเวศ',
    'nav.simulator': 'แบบจำลอง',
    'nav.piggyVault': 'กระปุกออมสิน',
    'nav.survey': 'สำรวจ MEP',
    'nav.team': 'ทีมงาน',
    'nav.liveImpact': 'สถิติสด',
    'nav.marketplace': 'ตลาดนักเรียน',
    'nav.donate': 'ร่วมบริจาค',
    'nav.projects': 'โครงงานนักเรียน',
    'nav.openWebApp': 'เข้าสู่แอป',
    'nav.launchStudio': 'เปิดใช้งาน SPR Web App',

    // Hero & Brand
    'brand.title': 'เอสพีอาร์ มันนี่ สตูดิโอ',
    'brand.tagline': 'ระบบจัดสรรเงินและวินัยการเงินนักเรียน (SPR)',
    'hero.badge': 'โรงเรียนสายปัญญารังสิต MEP · 2569',
    'hero.yourMoney': 'การเงินของคุณ.',
    'hero.yourCanvas': 'ผืนผ้าใบของคุณ.',
    'hero.title': 'วินัยทางการเงินอัจฉริยะสำหรับนักเรียนยุคใหม่',
    'hero.subhead': 'นักเรียนไม่จำเป็นต้องใช้เครื่องมือการเงินขององค์กรที่ซับซ้อน SPR คือสตูดิโอการเงินเชิงสร้างสรรค์ที่ออกแบบมาเพื่อช่วยให้นักเรียนเห็นว่าเงินค่าขนมรั่วไหลไปที่ไหน พร้อมจำลองการใช้จ่ายก่อนตัดสินใจซื้อ และเปลี่ยนเงินเหรียญที่เหลือเป็นเป้าหมายการออมจริง',
    'hero.simulateContext': 'จำลองสถานการณ์จริงของนักเรียน:',
    'hero.modeCampus': '[ 01 · กิจวัตรในโรงเรียน ]',
    'hero.modeResearch': '[ 02 · ห้องวิจัยและโครงงาน ]',
    'hero.launchBtn': 'เปิดใช้งาน Web App',
    'hero.simulatorBtn': 'ทดลองจำลองค่าใช้จ่าย',
    'hero.advisedBy': 'โครงงานนักเรียนสายปัญญารังสิต MEP · ให้คำปรึกษาโดย',
    'hero.sessionCampus': 'รอบที่ 01 · บันทึกค่าขนม จันทร์-ศุกร์ ในโรงเรียน',
    'hero.sessionResearch': 'รอบที่ 02 · ค่าใช้จ่ายทำโครงงานวิจัย',
    'hero.dailyBudget': 'งบประมาณต่อวัน',
    'hero.spent': 'ใช้ไปแล้ว',
    'hero.remaining': 'คงเหลือ',
    'hero.safeOnTrack': 'ปลอดภัย · เป็นไปตามแผน',
    'hero.safeProject': 'ปลอดภัย · อยู่ในงบโครงงาน',

    // Stats / App Usage
    'stats.totalUsers': 'ผู้ใช้งานและนักเรียนที่ลงทะเบียนทั้งหมด',
    'stats.dailyActive': 'นักเรียนที่วางแผนค่าขนมประจำวัน',
    'stats.dailyTransactions': 'รายการใช้จ่ายที่บันทึกวันนี้',
    'stats.totalTransactions': 'รายการธุรกรรมทั้งหมดในระบบ',
    'stats.activeGoals': 'เป้าหมายการออมเงินที่กำลังดำเนินการ',
    'stats.auditHeading': 'สถิติการใช้งานและผลกระทบในโรงเรียน',
    'stats.auditSub': 'ข้อมูลสถิติจริงจากฐานข้อมูล PostgreSQL โรงเรียนสายปัญญารังสิต',
    'stats.counterStudents': 'นักเรียนที่ลงทะเบียน',
    'stats.counterBudgeters': 'วางแผนค่าขนมประจำวัน',
    'stats.counterTxns': 'ธุรกรรมในระบบ',

    // Problem Section
    'problem.badge': 'ปัญหาทางการเงิน · ข้อมูลสำรวจ MEP',
    'problem.title': 'เงินค่าขนมนักเรียนหายไปไหนในแต่ละวัน?',
    'problem.subhead': 'จากการสำรวจความคิดเห็นของนักเรียนในห้องเรียน MEP โรงเรียนสายปัญญารังสิต เราค้นพบจุดบกพร่องหลัก 3 ประการในพฤติกรรมการเงินของนักเรียน',
    'problem.card1Title': 'เงินรั่วไหลในโรงอาหารแต่ละวัน',
    'problem.card1Desc': 'ขนมขบเคี้ยวช่วงบ่าย เครื่องดื่ม และชานมไข่มุก ค่อยๆ ทำให้เงินค่าขนมประจำสัปดาห์ร่อยหรอลงโดยไม่รู้ตัว',
    'problem.card2Title': 'ขาดการจำลองก่อนตัดสินใจจ่าย',
    'problem.card2Desc': 'การตัดสินใจซื้อเกิดขึ้นทันทีหน้าเคาน์เตอร์ ก่อนที่จะตรวจสอบว่าเงินที่เหลือจะเพียงพอสำหรับค่าเดินทางและอุปกรณ์การเรียนหรือไม่',
    'problem.card3Title': 'เพื่อนร่วมชั้นเผชิญปัญหาเพียงลำพัง',
    'problem.card3Desc': 'เมื่อนักเรียนต้องเผชิญกับค่าอุปกรณ์โครงงานกะทันหันหรือเงินไม่พอ ช่องทางช่วยเหลือซึ่งกันและกันยังกระจัดกระจายและไม่โปร่งใส',

    // 3-Pillar Ledger
    'pillars.badge': 'สถาปัตยกรรมระบบ',
    'pillars.title': 'สมุดบัญชีนักเรียน 3 เสาหลัก',
    'pillars.subhead': 'SPR ปรับเปลี่ยนระบบบัญชีให้กลายเป็น 3 กิจวัตรที่จับต้องได้และสอดคล้องกับวิถีชีวิตประจำวันของนักเรียน',
    'pillars.p1Title': 'จัดสรรเงินค่าขนมประจำวัน',
    'pillars.p1Desc': 'คำนวณวงเงินที่ใช้จ่ายได้อย่างปลอดภัยในแต่ละวันโดยอัตโนมัติ ตามค่าขนมรายสัปดาห์และมื้ออาหารกลางวัน',
    'pillars.p2Title': 'จำลองการใช้จ่ายก่อนตัดสินใจ',
    'pillars.p2Desc': 'จำลองค่าอาหารกลางวันหรือเครื่องเขียนก่อนซื้อจริง เพื่อให้เห็นภาพเงินคงเหลือและทิศทางการออมได้อย่างชัดเจน',
    'pillars.p3Title': 'กระปุกออมสินเป้าหมาย Piggy Vault',
    'pillars.p3Desc': 'นำเงินเหรียญที่เหลือจากมื้อกลางวันมาเก็บในเป้าหมายการออม พร้อมแถบแสดงเปอร์เซ็นต์ความคืบหน้าแบบเรียลไทม์',

    // Mutual Aid Ecosystem
    'ecosystem.badge': 'ระบบช่วยเหลือซึ่งกันและกันในโรงเรียน',
    'ecosystem.title': 'ระบบนิเวศการเงินที่สร้างผลกระทบเชิงบวกจริงในโรงเรียน',
    'ecosystem.subhead': 'ช่องทางการระดมทุนที่โปร่งใสและตรวจสอบได้ เพื่อเชื่อมโยงนักเรียน โครงงานโรงเรียน และสิ่งแวดล้อม',
    'ecosystem.tryland': 'TRYLAND (ปลูกต้นไม้และสิ่งแวดล้อม)',
    'ecosystem.trylandDesc': 'ร่วมปลูกต้นไม้ในโรงเรียนและชุมชนเพื่อลดก๊าซคาร์บอนไดออกไซด์ ตรวจสอบได้โปร่งใสผ่านบัญชีกลาง',
    'ecosystem.rk': 'RK (Random Kindness ช่วยเหลือเพื่อน)',
    'ecosystem.rkDesc': 'ช่วยเหลือค่าอาหารกลางวัน ชุดนักเรียน และค่าอุปกรณ์โครงงานของเพื่อนนักเรียนโดยไม่เปิดเผยตัวตน',
    'ecosystem.donate': 'SPR Donate โครงการระดมทุน',
    'ecosystem.donateDesc': 'ระดมทุนจัดซื้ออุปกรณ์การศึกษา คอมพิวเตอร์ และสื่อการเรียนรู้ดิจิทัลเพื่อพัฒนาห้องเรียน',

    // Spending Simulator
    'simulator.badge': 'แบบจำลองการใช้จ่ายเชิงโต้ตอบ',
    'simulator.title': 'ทดสอบผลกระทบทางการเงินก่อนจ่ายจริง',
    'simulator.subhead': 'ดูว่าการใช้จ่ายในวันนี้จะส่งผลต่องบอาหารกลางวันในวันพรุ่งนี้และเป้าหมายการออมระยะยาวของคุณอย่างไร',

    // Visual Piggy Vault
    'piggy.badge': 'กระปุกออมสินดิจิทัล',
    'piggy.title': 'เฝ้าดูเป้าหมายการออมเติบโตเป็นเงินบาทจริง',
    'piggy.subhead': 'ทุกบาทที่ประหยัดได้จะเติมเต็มกระปุกออมสินดิจิทัลของคุณ พร้อมภาพแสดงความคืบหน้าที่สนุกสนาน',

    // Auth
    'auth.signIn': 'เข้าสู่ระบบ',
    'auth.signUp': 'สมัครสมาชิก',
    'auth.welcomeBack': 'ยินดีต้อนรับกลับมา',
    'auth.signInSub': 'ลงชื่อเข้าใช้เพื่อจัดการค่าขนมและเป้าหมายการเงินของคุณ',
    'auth.email': 'อีเมล',
    'auth.password': 'รหัสผ่าน',
    'auth.loginBtn': 'เข้าสู่ระบบ SPR Studio',
    'auth.createAccount': 'สร้างบัญชีใหม่',
    'auth.orContinueWith': 'หรือดำเนินการต่อด้วย',
    'auth.continueGoogle': 'ดำเนินการต่อด้วย Google',

    // Settings & Actions
    'settings.language': 'ภาษา / Language',
    'settings.theme': 'ธีมการแสดงผล',
    'settings.logOut': 'ออกจากระบบ',
    'settings.back': 'ย้อนกลับ',

    // Metrics
    'metrics.verifiedTransfers': 'รายการโอนที่ตรวจสอบแล้ว',
    'metrics.verifiedTransfersSub': 'สลิปธนาคารถูกตรวจสอบและอนุมัติแล้ว',
    'metrics.billsFunded': 'บิลนักเรียนที่ได้รับการสนับสนุนครบถ้วน',
    'metrics.billsFundedSub': 'ส่งมอบความช่วยเหลือถึงมือนักเรียน 100%',
    'metrics.causesReached': 'โครงการระดมทุนที่บรรลุเป้าหมาย',
    'metrics.causesReachedSub': 'เป้าหมายสำเร็จสมบูรณ์',

    // Footer
    'footer.rights': 'ทีมงาน Piggy Pockets · โรงเรียนสายปัญญารังสิต MEP. สงวนลิขสิทธิ์ทั้งหมด',
    'footer.privacy': 'ข้อมูลการเงินนักเรียนได้รับการเข้ารหัสความปลอดภัยและไม่มีการจำหน่ายต่อบุคคลภายนอก',
    'footer.advisor': 'อาจารย์ที่ปรึกษาโครงงาน: Mr. Anthony Jose B. Ferrer',
    'footer.school': 'โรงเรียนสายปัญญารังสิต · Mini English Program (MEP)',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const saved = await getTokenSafe(LANGUAGE_STORAGE_KEY);
        if (isMounted && saved && (saved === 'en' || saved === 'th')) {
          setLanguageState(saved as Language);
        } else if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
          const browserLang = navigator.language?.toLowerCase() || '';
          if (browserLang.startsWith('th')) {
            setLanguageState('th');
          }
        }
      } catch (err) {
        console.warn('Failed to load language preference:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setTokenSafe(LANGUAGE_STORAGE_KEY, lang).catch((err) => {
      console.warn('Failed to persist language:', err);
    });
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next: Language = prev === 'en' ? 'th' : 'en';
      setTokenSafe(LANGUAGE_STORAGE_KEY, next).catch((err) => {
        console.warn('Failed to persist language toggle:', err);
      });
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const langDict = translations[language];
      if (langDict && langDict[key]) {
        return langDict[key];
      }
      const enDict = translations.en;
      if (enDict && enDict[key]) {
        return enDict[key];
      }
      return fallback || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
