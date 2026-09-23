'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ClinicProvider } from '../../lib/context/ClinicContext';
import { useRouter } from 'next/navigation';
import { useClinic } from '../../lib/context/ClinicContext';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { CommandPalette } from '../ui/CommandPalette';
import { PrintModal } from '../ui/PrintModal';
import { OfflineBanner } from '../ui/OfflineBanner';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isLoading } = useClinic();
  const isAuthPage = pathname === '/login' || pathname === '/';
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthorized = React.useMemo(() => {
    if (isLoading || isAuthPage || !mounted) return true;
    if (role === 'admin') return true;

    if (role === 'partner') {
      const allowedPathsForPartner = ['/dashboard', '/finance-reports', '/finance', '/reports', '/expenses', '/inventory', '/purchases'];
      return allowedPathsForPartner.some(path => pathname === path || pathname.startsWith(path + '/'));
    }

    if (role === 'staff') {
      const allowedPathsForStaff = [
        '/dashboard',
        '/appointments',
        '/calendar',
        '/bookings',
        '/clients',
        '/pos',
        '/services',
        '/inventory',
        '/attendance',
        '/reminders'
      ];
      return allowedPathsForStaff.some(path => pathname === path || pathname.startsWith(path + '/'));
    }

    return false;
  }, [role, isLoading, pathname, isAuthPage]);

  React.useEffect(() => {
    if (!isLoading && !isAuthorized && !isAuthPage) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthorized, isAuthPage, router]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!isAuthorized && !isLoading) {
    return (
      <div className="flex min-h-screen bg-[#0B0F17]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0 flex items-center justify-center min-h-[400px]">
            <div className="text-slate-500 animate-pulse font-bold">Redirecting...</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <OfflineBanner />
      {mounted && isLoading && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 z-50 animate-pulse pointer-events-none" />
      )}
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 max-w-7xl 2xl:max-w-[1600px] w-full mx-auto min-w-0 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
      <PrintModal />
    </>
  );
};

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ClinicProvider>
      <AppShell>{children}</AppShell>
    </ClinicProvider>
  );
};
