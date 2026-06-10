'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from './admin.module.css';

interface DemographicStat {
  name: string;
  count: number;
}

export default function AdminOverview() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    users: 0,
    generations: 0,
    bikes: 0,
    questions: 0
  });

  const [demographics, setDemographics] = useState<{
    ageRanges: DemographicStat[];
    genders: DemographicStat[];
    divisions: DemographicStat[];
    bikes: DemographicStat[];
  } | null>(null);
  
  const [loadingDemo, setLoadingDemo] = useState(true);
  const [role, setRole] = useState<'admin' | 'superadmin'>('admin');

  useEffect(() => {
    fetchRoleAndStats();
  }, []);

  const fetchRoleAndStats = async () => {
    try {
      const res = await fetch('/api/admin/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const userRole = data.user.role || 'admin';
          setRole(userRole);
          
          // Now fetch stats based on role
          fetchStats(userRole);
          
          if (userRole === 'admin') {
            fetchDemographics();
          } else {
            setLoadingDemo(false);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch user role/stats:', err);
      setLoadingDemo(false);
    }
  };

  const fetchStats = async (userRole: 'admin' | 'superadmin') => {
    try {
      const fetchUsers = fetch('/api/admin/users?limit=1').then(r => r.json());
      const fetchGens = fetch('/api/admin/generations?limit=1').then(r => r.json());
      
      if (userRole === 'superadmin') {
        const [u, g, b, q] = await Promise.all([
          fetchUsers,
          fetchGens,
          fetch('/api/admin/bikes').then(r => r.json()),
          fetch('/api/admin/quiz/questions').then(r => r.json())
        ]);
        setStats({
          users: u.total || 0,
          generations: g.total || 0,
          bikes: b.bikes?.length || 0,
          questions: q.questions?.length || 0
        });
      } else {
        const [u, g] = await Promise.all([
          fetchUsers,
          fetchGens
        ]);
        setStats({
          users: u.total || 0,
          generations: g.total || 0,
          bikes: 0,
          questions: 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchDemographics = async () => {
    try {
      const res = await fetch('/api/admin/overview/stats');
      if (res.ok) {
        const data = await res.json();
        setDemographics(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch demographic stats:', err);
    } finally {
      setLoadingDemo(false);
    }
  };

  const shortcuts = [
    { label: t.admin.overview.shortcuts.users, path: '/admin/users', icon: '👤', color: '#007aff' },
    { label: t.admin.overview.shortcuts.generations, path: '/admin/generations', icon: '🖼️', color: '#00ff7a' },
    { label: t.admin.overview.shortcuts.bikes, path: '/admin/bikes', icon: '🏍️', color: '#ff7a00' },
    { label: t.admin.overview.shortcuts.quiz, path: '/admin/quiz', icon: '❓', color: '#7a00ff' },
    { label: t.admin.overview.shortcuts.settings, path: '/admin/settings', icon: '⚙️', color: '#888' },
  ];

  const renderSkeletonSection = () => (
    <div className={styles.statsTwoColGrid} style={{ marginTop: '24px', marginBottom: '48px' }}>
      {[1, 2, 3, 4].map(idx => (
        <div key={idx} className={styles.skeletonCard} style={{ borderRadius: '20px', padding: '32px' }}>
          <div className={styles.skeletonLabel} style={{ width: '150px', height: '20px', marginBottom: '24px' }}></div>
          {[1, 2, 3].map(rowIdx => (
            <div key={rowIdx} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div className={styles.skeletonLabel} style={{ width: '80px', height: '14px' }}></div>
                <div className={styles.skeletonLabel} style={{ width: '30px', height: '14px' }}></div>
              </div>
              <div className={styles.skeletonLabel} style={{ width: '100%', height: '6px', borderRadius: '3px' }}></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderCategoryCard = (title: string, data: DemographicStat[], color: string, badgeBg: string, badgeColor: string) => {
    const totalCount = data.reduce((sum, item) => sum + item.count, 0) || 1;

    return (
      <div className={styles.statCard} style={{
        background: 'linear-gradient(145deg, #0d0d0d 0%, #151515 100%)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '32px',
        borderRadius: '20px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 700,
          color: 'white',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          letterSpacing: '-0.3px'
        }}>
          <span>{title}</span>
          <span style={{
            fontSize: '11px',
            background: badgeBg,
            color: badgeColor,
            padding: '4px 12px',
            borderRadius: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {t.admin.overview.count}: {totalCount}
          </span>
        </h3>
        
        {data.length === 0 ? (
          <div style={{
            color: 'rgba(255, 255, 255, 0.25)',
            fontSize: '13px',
            padding: '40px 0',
            textAlign: 'center',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.01)'
          }}>
            {t.admin.overview.noData}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {data.map((item, idx) => {
              const percent = Math.round((item.count / totalCount) * 100);
              return (
                <div key={idx} style={{
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid rgba(255, 255, 255, 0.02)',
                  borderRadius: '12px',
                }} className={styles.itemHover}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'white' }}>{item.name}</span>
                    <span>
                      <strong style={{ color: 'white', fontWeight: 700 }}>{item.count}</strong>
                      <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', marginLeft: '4px' }}>({percent}%)</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: color,
                      borderRadius: '3px',
                      transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <h1>{t.admin.overview.title}</h1>
      </div>

      <div className={role === 'admin' ? styles.statsTwoColGrid : styles.statGrid}>
        <div className={styles.statCard} style={{
          borderLeft: '4px solid #007aff',
          background: 'linear-gradient(145deg, #0d0d0d 0%, #151515 100%)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
          borderRadius: '16px'
        }}>
          <div className={styles.statValue} style={{ fontSize: '48px', fontWeight: 800, color: 'white', letterSpacing: '-1px' }}>{stats.users}</div>
          <div className={styles.statLabel} style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{t.admin.overview.totalUsers}</div>
        </div>
        <div className={styles.statCard} style={{
          borderLeft: '4px solid #00ff7a',
          background: 'linear-gradient(145deg, #0d0d0d 0%, #151515 100%)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
          borderRadius: '16px'
        }}>
          <div className={styles.statValue} style={{ fontSize: '48px', fontWeight: 800, color: 'white', letterSpacing: '-1px' }}>{stats.generations}</div>
          <div className={styles.statLabel} style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{t.admin.overview.totalGenerations}</div>
        </div>
        {role === 'superadmin' && (
          <>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.bikes}</div>
              <div className={styles.statLabel}>{t.admin.overview.availableBikes}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.questions}</div>
              <div className={styles.statLabel}>{t.admin.overview.quizQuestions}</div>
            </div>
          </>
        )}
      </div>

      {role === 'admin' && (
        <>
          <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 600, color: 'white' }}>
            {t.admin.overview.demographicsTitle}
          </h2>
          {loadingDemo ? renderSkeletonSection() : (
            <div className={styles.statsTwoColGrid}>
              {renderCategoryCard(t.admin.overview.ageRanges, demographics?.ageRanges || [], 'linear-gradient(90deg, #007aff, #00c6ff)', 'rgba(0, 122, 255, 0.15)', '#00c6ff')}
              {renderCategoryCard(t.admin.overview.genders, demographics?.genders || [], 'linear-gradient(90deg, #00ff7a, #00ffcc)', 'rgba(0, 255, 122, 0.15)', '#00ffcc')}
              {renderCategoryCard(t.admin.overview.divisions, demographics?.divisions || [], 'linear-gradient(90deg, #ff7a00, #ffb400)', 'rgba(255, 122, 0, 0.15)', '#ffb400')}
              {renderCategoryCard(t.admin.overview.bikes, demographics?.bikes || [], 'linear-gradient(90deg, #7a00ff, #b500ff)', 'rgba(122, 0, 255, 0.15)', '#b500ff')}
            </div>
          )}
        </>
      )}

      {role === 'superadmin' && (
        <>
          <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 600, color: 'white' }}>{t.admin.overview.shortcutsTitle}</h2>
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
        </>
      )}
    </div>
  );
}
