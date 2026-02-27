'use client';

import { useEffect } from 'react';
import { FeedbackProvider } from '@/components/ui/feedback';
import { useAuthStore } from '@/store/authStore';

function AuthBootstrap() {
  const setSession = useAuthStore((state) => state.setSession);
  const setHasHydrated = useAuthStore((state) => state.setHasHydrated);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        const payload = await response.json().catch(() => ({}));
        if (!mounted) return;

        if (response.ok && payload?.success && payload?.data) {
          setSession({
            id: payload.data.id,
            email: payload.data.email,
            username: payload.data.username,
          });
        } else {
          if (!useAuthStore.getState().isAuthenticated) {
            setSession(null);
          }
        }
      } catch {
        if (!mounted) return;
        if (!useAuthStore.getState().isAuthenticated) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setHasHydrated(true);
        }
      }
    };

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [setHasHydrated, setSession]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FeedbackProvider>
      <AuthBootstrap />
      {children}
    </FeedbackProvider>
  );
}
