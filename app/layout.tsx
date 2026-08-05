import type { Metadata } from 'next';
import './globals.css';
import { ClinicProvider } from '../lib/context/ClinicContext';
import { Sidebar } from '../components/layout/Sidebar';
import { Navbar } from '../components/layout/Navbar';
import { CommandPalette } from '../components/ui/CommandPalette';
import { PrintModal } from '../components/ui/PrintModal';

export const metadata: Metadata = {
  title: 'Aura Luxury Clinic & Med Spa - Executive Dashboard',
  description: 'Ultra-luxury aesthetic clinic SaaS dashboard inspired by Stripe, Linear, Notion & Vercel.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 min-h-screen">
        <ClinicProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Navbar />
              <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                {children}
              </main>
            </div>
          </div>
          <CommandPalette />
          <PrintModal />
        </ClinicProvider>
      </body>
    </html>
  );
}
