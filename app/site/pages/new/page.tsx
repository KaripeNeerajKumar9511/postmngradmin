'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewSitePageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/site');
  }, [router]);
  return null;
}
