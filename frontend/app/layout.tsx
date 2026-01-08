import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ChunkErrorHandler } from '@/components/chunk-error-handler';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: false, // Disable preload to avoid warning
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'SMS SaaS Platform',
  description: 'Multi-tenant SMS AI SaaS Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <ChunkErrorHandler />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

