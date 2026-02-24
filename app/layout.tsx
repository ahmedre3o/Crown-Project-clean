import React from 'react';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Crown Services',
  description: 'SaaS system for Crown Services',
  manifest: '/manifest.webmanifest',
  themeColor: '#06b6d4',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-black text-white min-h-screen">
        <Providers>
          {children}
        </Providers>
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}

