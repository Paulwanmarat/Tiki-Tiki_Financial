import React from 'react';
import { WebLanding } from '@/components/WebLanding';
import Head from 'expo-router/head';

export default function WebRootLayout() {
  return (
    <>
      <Head>
        <title>SPR App — Student Pecuniary Routine App</title>
        <meta name="description" content="SPR App helps students manage spending, savings, goals, and everyday financial decisions with real financial tracking and AI-assisted guidance." />
      </Head>
      <WebLanding />
    </>
  );
}
