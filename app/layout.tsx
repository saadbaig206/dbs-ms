import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '../components/layout/AppShell';
import { CLINIC_INFO } from '../lib/constants/clinic';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0B0F17' },
    { media: '(prefers-color-scheme: light)', color: '#F1F5F9' },
  ],
};

export const metadata: Metadata = {
  title: `${CLINIC_INFO.name} - POS & Management System`,
  description: 'Point of sale, bookings, inventory, staff and finance management for DBS Aesthetic Clinic and Salon.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[var(--bg-main)] text-[var(--text-primary)] min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
