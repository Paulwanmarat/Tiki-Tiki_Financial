import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

export function WebLanding() {
  const windowWidth = Dimensions.get('window').width;
  const isMobile = windowWidth < 768;

  const features = [
    {
      icon: 'calculator-outline',
      title: 'Spending Simulator',
      description: 'Check how a purchase affects your goals before you buy.',
    },
    {
      icon: 'sparkles-outline',
      title: 'AI Financial Assistant',
      description: 'Get personalized advice based on your actual spending habits.',
    },
    {
      icon: 'flag-outline',
      title: 'Savings Goals',
      description: 'Set goals and track your progress automatically.',
    },
    {
      icon: 'camera-outline',
      title: 'Smart Menu Scanner',
      description: 'Scan restaurant menus to find the best value for your budget.',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section */}
      <View style={[styles.hero, isMobile && styles.heroMobile]}>
        <View style={styles.heroTextContainer}>
          <Text style={styles.badge}>TIKI FINANCE</Text>
          <Text style={[styles.title, isMobile && styles.titleMobile]}>
            Smart Money Management for Students
          </Text>
          <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]}>
            Understand your spending, reach your savings goals, and get personalized AI advice based on your real financial data.
          </Text>
          
          <View style={styles.downloadContainer}>
            <Pressable style={[styles.storeButton, { backgroundColor: '#000' }]} onPress={() => alert('Android App Coming Soon!')}>
              <Ionicons name="logo-google-playstore" size={24} color="#FFF" />
              <View style={styles.storeButtonText}>
                <Text style={styles.storeSmallText}>GET IT ON</Text>
                <Text style={styles.storeLargeText}>Google Play</Text>
              </View>
            </Pressable>
            
            <Pressable style={[styles.storeButton, { backgroundColor: '#000' }]} onPress={() => alert('iOS App Coming Soon!')}>
              <Ionicons name="logo-apple" size={24} color="#FFF" />
              <View style={styles.storeButtonText}>
                <Text style={styles.storeSmallText}>Download on the</Text>
                <Text style={styles.storeLargeText}>App Store</Text>
              </View>
            </Pressable>
          </View>
        </View>
        
        {!isMobile && (
          <View style={styles.heroImageContainer}>
            <View style={styles.mockupContainer}>
              <Ionicons name="phone-portrait-outline" size={300} color={Colors.light.primary} />
            </View>
          </View>
        )}
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Everything you need to master your money</Text>
        <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
          {features.map((feature, idx) => (
            <View key={idx} style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon as any} size={32} color={Colors.light.primary} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.description}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingBottom: Spacing.huge,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '10%',
    paddingVertical: 100,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  heroMobile: {
    flexDirection: 'column',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.huge,
  },
  heroTextContainer: {
    flex: 1,
    maxWidth: 600,
  },
  badge: {
    color: Colors.light.primary,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.5,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 56,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
    lineHeight: 64,
    marginBottom: Spacing.xl,
  },
  titleMobile: {
    fontSize: 40,
    lineHeight: 48,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: '#475569',
    lineHeight: 28,
    marginBottom: Spacing.xxl,
  },
  subtitleMobile: {
    fontSize: FontSize.md,
  },
  downloadContainer: {
    flexDirection: 'row',
    gap: Spacing.lg,
    flexWrap: 'wrap',
  },
  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  storeButtonText: {
    justifyContent: 'center',
  },
  storeSmallText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '500',
  },
  storeLargeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  heroImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupContainer: {
    width: 300,
    height: 600,
    backgroundColor: '#F1F5F9',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  featuresSection: {
    paddingHorizontal: '10%',
    paddingVertical: 100,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 60,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xxl,
    justifyContent: 'center',
  },
  featuresGridMobile: {
    flexDirection: 'column',
  },
  featureCard: {
    width: '45%',
    minWidth: 300,
    backgroundColor: '#FFFFFF',
    padding: Spacing.xxl,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  featureCardMobile: {
    width: '100%',
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  featureTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
    marginBottom: Spacing.sm,
  },
  featureDesc: {
    fontSize: FontSize.md,
    color: '#64748B',
    lineHeight: 24,
  },
});
