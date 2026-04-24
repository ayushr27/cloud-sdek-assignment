'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = ['/login', '/register'].includes(pathname);

  if (isPublicRoute) {
    return <main className="flex-1 overflow-y-auto">{children}</main>;
  }

  return (
    <div className="flex w-full h-screen overflow-hidden bg-[#E4E5E8]">
      {/* Sidebar: desktop only */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden md:py-4 md:pr-4 md:pl-3 bg-transparent">
        <main className="h-full w-full overflow-y-auto">
          <div className="w-full">
            <Header />
            <div className="mt-2 md:mt-4 px-4 md:px-0">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}
