'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

const PUBLIC_ROUTES = ['/login', '/register'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!mounted || isLoading) return;

    const isPublic = PUBLIC_ROUTES.includes(pathname);
    
    if (!isAuthenticated && !isPublic) {
      router.replace('/login');
    } else if (isAuthenticated && isPublic) {
      router.replace('/assignments');
    }
  }, [isAuthenticated, isLoading, pathname, router, mounted]);

  // Prevent hydration mismatch & hide protected content while checking auth
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-veda"></div>
      </div>
    );
  }

  // If unauthenticated and on a protected route, render nothing until redirect happens
  if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
    return null; 
  }

  return <>{children}</>;
}
