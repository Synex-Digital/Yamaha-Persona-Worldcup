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
  const [role, setRole] = useState<'admin' | 'superadmin'>('admin');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    // Check auth
    fetch('/api/admin/auth/me').then(res => {
      if (!res.ok) {
        router.push('/admin/login');
      } else {
        res.json().then(data => {
          if (data.user) {
            setRole(data.user.role || 'admin');
          }
          setLoading(false);
        });
      }
    });
  }, [router, pathname]);

  useEffect(() => {
    if (loading) return;

    const forbiddenPaths = ['/admin/bikes', '/admin/quiz', '/admin/settings'];
    const isForbidden = forbiddenPaths.some(p => pathname.startsWith(p));
    
    if (role === 'admin' && isForbidden) {
      router.push('/admin');
    }
  }, [loading, role, pathname, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) return <div style={{ padding: '80px', color: 'white', textAlign: 'center' }}>{t.admin.verifying}</div>;

  // Don't show sidebar/layout on login page
  if (pathname === '/admin/login') return <>{children}</>;

  const navItems: { label: string; path: string; tab: string }[] = [
    { label: t.admin.nav.overview, path: '/admin', tab: 'overview' },
    { label: t.admin.nav.users, path: '/admin/users', tab: 'users' },
    { label: t.admin.nav.generations, path: '/admin/generations', tab: 'generations' },
  ];

  if (role === 'superadmin') {
    navItems.push(
      { label: t.admin.nav.bikes, path: '/admin/bikes', tab: 'bikes' },
      { label: t.admin.nav.quiz, path: '/admin/quiz', tab: 'quiz' },
      { label: t.admin.nav.settings, path: '/admin/settings', tab: 'settings' }
    );
  }

  const getIcon = (tab: string, isActive: boolean) => {
    const activeColor = '#007aff';
    const inactiveColor = 'rgba(255, 255, 255, 0.4)';
    const color = isActive ? activeColor : inactiveColor;

    switch (tab) {
      case 'overview':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.2s', flexShrink: 0 }}>
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </svg>
        );
      case 'users':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.2s', flexShrink: 0 }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'generations':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.2s', flexShrink: 0 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        );
      case 'bikes':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.2s', flexShrink: 0 }}>
            <circle cx="5" cy="18" r="3" />
            <circle cx="19" cy="18" r="3" />
            <path d="M12 18V12H9l3-4h3l3 4h-3" />
            <path d="M5 18h14" />
            <path d="M19 18v-3l-2-2h-3" />
          </svg>
        );
      case 'quiz':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.2s', flexShrink: 0 }}>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'settings':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.2s', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        );
      case 'logout':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.layout}>
      {/* Mobile Top Bar */}
      <div className={styles.mobileHeader}>
        <button onClick={() => setSidebarOpen(true)} className={styles.menuBtn} aria-label="Open menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className={styles.mobileBrand}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#007aff' }}></div>
          {t.admin.brand}
        </div>
        <div style={{ width: 40 }}></div>
      </div>

      {/* Sidebar Overlay Backdrop for Mobile */}
      {sidebarOpen && <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />}

      <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#007aff' }}></div>
          <span style={{ flex: 1 }}>{t.admin.brand}</span>
          <button 
            className={styles.sidebarCloseBtn} 
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(item => {
            const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                {getIcon(item.tab, isActive)}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button 
          onClick={async () => {
            await fetch('/api/admin/auth/logout', { method: 'POST' });
            router.push('/admin/login');
          }}
          className={styles.navItem}
          style={{ 
            marginTop: 'auto', 
            marginBottom: '40px', // Breathing room for dev feedback overlays
            border: 'none', 
            background: 'transparent', 
            width: '100%', 
            textAlign: 'left', 
            cursor: 'pointer', 
            color: '#ff4d4d',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          {getIcon('logout', false)}
          <span>{t.admin.nav.logout}</span>
        </button>
      </div>

      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
