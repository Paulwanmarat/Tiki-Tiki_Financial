import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LOCAL_API_URL } from '@/services/ai/client';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FeedbackScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { token } = useAuth();
  
  const [type, setType] = useState('bug'); // bug, feature, other
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Missing Info', 'Please enter your feedback message.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${LOCAL_API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          type, 
          message, 
          rating,
          platform: 'mobile',
          app_version: '1.0.0'
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Thank you for your feedback!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', data.error || 'Failed to submit feedback.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Send Feedback</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: colors.text }]}>Category</Text>
        <View style={styles.typeSelector}>
          {['bug', 'feature', 'other'].map((t) => (
            <TouchableOpacity 
              key={t}
              style={[
                styles.typeOption, 
                { borderColor: colors.border },
                type === t && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setType(t)}
            >
              <Text style={[
                styles.typeText,
                { color: colors.textSecondary },
                type === t && { color: '#FFF' }
              ]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Message</Text>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          placeholder="Tell us what you think..."
          placeholderTextColor={colors.textTertiary}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Text style={[styles.label, { color: colors.text, marginTop: Spacing.xl }]}>Rate the App (Optional)</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Ionicons 
                name={rating && rating >= star ? "star" : "star-outline"} 
                size={32} 
                color={rating && rating >= star ? "#F59E0B" : colors.textTertiary} 
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Feedback</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Spacing.lg, 
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  content: { padding: Spacing.xl },
  label: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  typeSelector: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  typeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
  },
  typeText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    minHeight: 120,
  },
  ratingContainer: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xxl },
  submitButton: {
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
});
