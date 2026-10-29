import React from 'react';
import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { WebLanding } from '@/components/WebLanding';

export default function RootIndexScreen() {
  if (Platform.OS === 'web') {
    return <WebLanding />;
  }

  // Native mobile platforms route directly into the mobile application experience
  return <Redirect href={'/app' as any} />;
}
