'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { validateAndRestoreActiveProject } from '@/lib/projectContext';

export default function ProjectContextProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function restoreContext() {
      // Only validate if we're on a route that needs project context
      if (pathname === '/calendar') {
        const project = await validateAndRestoreActiveProject();
        if (!project) {
          // No valid project, redirect to projects page
          router.push('/projects');
        }
      }
    }

    restoreContext();
  }, [pathname, router]);

  return <>{children}</>;
}
