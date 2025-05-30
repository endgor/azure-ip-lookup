// filepath: /Users/ender/Projects/azure-ip-lookup/src/pages/_app.tsx
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Azure IP Lookup Tool - Check if an IP belongs to Azure" />
      </Head>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
