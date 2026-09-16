import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import surveyData from '@/constants/surveyData.json';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export function SurveyResults() {
  const windowWidth = Dimensions.get('window').width;
  const isMobile = windowWidth < 768;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>User Research & Survey Results</Text>
      <Text style={styles.subtitle}>
        Based on a recent survey of {surveyData.totalResponses} students and young adults.
      </Text>

      <View style={[styles.grid, isMobile && styles.gridMobile]}>
        {/* Ages */}
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          <View style={styles.cardHeader}>
            <Ionicons name="people-outline" size={24} color={Colors.light.primary} />
            <Text style={styles.cardTitle}>Demographics</Text>
          </View>
          {Object.entries(surveyData.distributions.ages)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .map(([age, count]) => (
            <View key={age} style={styles.barRow}>
              <Text style={styles.barLabel}>{age}</Text>
              <View style={styles.barContainer}>
                <View style={[styles.bar, { width: `${((count as number) / surveyData.totalResponses) * 100}%` }]} />
              </View>
              <Text style={styles.barValue}>{count as number}</Text>
            </View>
          ))}
        </View>

        {/* Spending */}
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          <View style={styles.cardHeader}>
            <Ionicons name="cart-outline" size={24} color={Colors.light.primary} />
            <Text style={styles.cardTitle}>Top Spending Categories</Text>
          </View>
          {Object.entries(surveyData.distributions.spendMoneyOn)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 4)
            .map(([category, count]) => (
            <View key={category} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>{category}</Text>
              <View style={styles.barContainer}>
                <View style={[styles.bar, { width: `${((count as number) / surveyData.totalResponses) * 100}%`, backgroundColor: '#F59E0B' }]} />
              </View>
              <Text style={styles.barValue}>{count as number}</Text>
            </View>
          ))}
        </View>

        {/* Most Useful Features */}
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          <View style={styles.cardHeader}>
            <Ionicons name="star-outline" size={24} color={Colors.light.primary} />
            <Text style={styles.cardTitle}>Most Requested Features</Text>
          </View>
          {Object.entries(surveyData.distributions.mostUsefulFeature)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 4)
            .map(([feature, count]) => (
            <View key={feature} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>{feature}</Text>
              <View style={styles.barContainer}>
                <View style={[styles.bar, { width: `${((count as number) / surveyData.totalResponses) * 100}%`, backgroundColor: '#10B981' }]} />
              </View>
              <Text style={styles.barValue}>{count as number}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: '10%',
    paddingVertical: 80,
    backgroundColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 60,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xxl,
    justifyContent: 'center',
  },
  gridMobile: {
    flexDirection: 'column',
  },
  card: {
    width: '30%',
    minWidth: 320,
    backgroundColor: '#FFFFFF',
    padding: Spacing.xxl,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardMobile: {
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  barLabel: {
    width: 100,
    fontSize: FontSize.sm,
    color: '#475569',
  },
  barContainer: {
    flex: 1,
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: BorderRadius.full,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.full,
  },
  barValue: {
    width: 30,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#0F172A',
    textAlign: 'right',
  },
});
