'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from './admin.module.css';

export default function AdminOverview() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    users: 0,
    generations: 0,
    bikes: 0,
    questions: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [u, g, b, q] = await Promise.all([
      fetch('/api/admin/users?limit=1').then(r => r.json()),
      fetch('/api/admin/generations?limit=1').then(r => r.json()),
      fetch('/api/admin/bikes').then(r => r.json()),
      fetch('/api/admin/quiz/questions').then(r => r.json())
    ]);
    
    setStats({
      users: u.total || 0,
      generations: g.total || 0,
      bikes: b.bikes?.length || 0,
      questions: q.questions?.length || 0
    });
  };

  const shortcuts = [
    { label: t.admin.overview.shortcuts.users, path: '/admin/users', icon: '👤', color: '#007aff' },
    { label: t.admin.overview.shortcuts.generations, path: '/admin/generations', icon: '🖼️', color: '#00ff7a' },
    { label: t.admin.overview.shortcuts.bikes, path: '/admin/bikes', icon: '🏍️', color: '#ff7a00' },
    { label: t.admin.overview.shortcuts.quiz, path: '/admin/quiz', icon: '❓', color: '#7a00ff' },
    { label: t.admin.overview.shortcuts.settings, path: '/admin/settings', icon: '⚙️', color: '#888' },
  ];

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <h1>{t.admin.overview.title}</h1>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.users}</div>
          <div className={styles.statLabel}>{t.admin.overview.totalUsers}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.generations}</div>
          <div className={styles.statLabel}>{t.admin.overview.totalGenerations}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.bikes}</div>
          <div className={styles.statLabel}>{t.admin.overview.availableBikes}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.questions}</div>
          <div className={styles.statLabel}>{t.admin.overview.quizQuestions}</div>
        </div>
      </div>

      <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 600 }}>{t.admin.overview.shortcutsTitle}</h2>
      <div className={styles.statGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {shortcuts.map(s => (
          <Link key={s.path} href={s.path} className={styles.statCard} style={{ 
            cursor: 'pointer', 
            textDecoration: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            padding: '20px'
          }}>
            <div style={{ fontSize: '24px' }}>{s.icon}</div>
            <div>
              <div style={{ fontWeight: 600, color: 'white' }}>{s.label}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{t.admin.overview.shortcuts.management}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
