'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from './admin.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    // Check auth
    fetch('/api/admin/auth/me').then(res => {
      if (!res.ok) router.push('/admin/login');
      else setLoading(false);
    });
  }, [router, pathname]);

  if (loading) return <div style={{ padding: '80px', color: 'white', textAlign: 'center' }}>{t.admin.verifying}</div>;

  // Don't show sidebar/layout on login page
  if (pathname === '/admin/login') return <>{children}</>;

  const navItems = [
    { label: t.admin.nav.overview, path: '/admin', tab: 'overview' },
    { label: t.admin.nav.users, path: '/admin/users', tab: 'users' },
    { label: t.admin.nav.generations, path: '/admin/generations', tab: 'generations' },
    { label: t.admin.nav.bikes, path: '/admin/bikes', tab: 'bikes' },
    { label: t.admin.nav.quiz, path: '/admin/quiz', tab: 'quiz' },
    { label: t.admin.nav.settings, path: '/admin/settings', tab: 'settings' },
  ];

  return (
    <div className={styles.layout}>
      <div className={styles.sidebar}>
        <div className={styles.brand}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#007aff' }}></div>
          {t.admin.brand}
        </div>
        <nav style={{ flex: 1 }}>
          {navItems.map(item => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`${styles.navItem} ${pathname === item.path ? styles.active : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button 
          onClick={async () => {
            await fetch('/api/admin/auth/logout', { method: 'POST' });
            router.push('/admin/login');
          }}
          className={styles.navItem}
          style={{ marginTop: 'auto', border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#ff4d4d' }}
        >
          {t.admin.nav.logout}
        </button>
      </div>

      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
