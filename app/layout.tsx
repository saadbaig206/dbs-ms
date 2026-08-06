import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/layout/AppShell';
import { CLINIC_INFO } from '../lib/constants/clinic';

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-[var(--bg-main)] text-[var(--text-primary)] min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
