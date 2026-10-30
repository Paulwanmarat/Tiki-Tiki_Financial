import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import Head from 'expo-router/head';
import { WebLanding } from '@/components/WebLanding';

export function generateMetadata() {
  return {
    title: 'SPR Money Studio | Student Pecuniary Routine',
    description: 'Student Pecuniary Routine - Financial companion and smart allowance manager for students',
  };
}

export default function RootIndexScreen() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'SPR Money Studio | Student Pecuniary Routine';
    }
  }, []);

  if (Platform.OS === 'web') {
    return (
      <>
        <Head>
          <title>SPR Money Studio | Student Pecuniary Routine</title>
          <meta
            name="description"
            content="Student Pecuniary Routine - Financial companion and smart allowance manager for students"
          />
        </Head>
        <WebLanding />
      </>
    );
  }

  // Native mobile platforms route directly into the mobile application experience
  return <Redirect href={'/app' as any} />;
}
