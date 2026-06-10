'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from './admin.module.css';

interface DemographicStat {
  name: string;
  count: number;
}

export default function AdminOverview() {
  const { t } = useLanguage();
  const router = useRouter();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [stats, setStats] = useState({
    users: 0,
    generations: 0,
    bikes: 0,
    questions: 0,
    totalCost: 0,
    avgDurationMs: 0,
    avgTokens: 0
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if typing in form inputs, textareas, or editable elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Bypass shortcut if standard browser command modifier is held
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const keyMap: Record<string, string> = {
        u: '/admin/users',
        g: '/admin/generations',
        b: '/admin/bikes',
        q: '/admin/quiz',
        s: '/admin/settings',
      };

      const path = keyMap[key];
      if (path) {
        // Enforce role permission limits
        if (role === 'superadmin' || ['/admin/users', '/admin/generations'].includes(path)) {
          e.preventDefault();
          router.push(path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [role, router]);

  const fetchRoleAndStats = async () => {
    try {
      const res = await fetch('/api/admin/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const userRole = data.user.role || 'admin';
          setRole(userRole);
          
          fetchStats(userRole);
          fetchDemographics();
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
        const [u, g, b, q, superStatsRes] = await Promise.all([
          fetchUsers,
          fetchGens,
          fetch('/api/admin/bikes').then(r => r.json()),
          fetch('/api/admin/quiz/questions').then(r => r.json()),
          fetch('/api/admin/generations/stats')
        ]);
        
        let superStats = { totalCost: 0, avgDurationMs: 0, avgTokens: 0 };
        if (superStatsRes.ok) {
          try {
            superStats = await superStatsRes.json();
          } catch {}
        }

        setStats({
          users: u.total || 0,
          generations: g.total || 0,
          bikes: b.bikes?.length || 0,
          questions: q.questions?.length || 0,
          totalCost: superStats.totalCost || 0,
          avgDurationMs: superStats.avgDurationMs || 0,
          avgTokens: superStats.avgTokens || 0
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
          questions: 0,
          totalCost: 0,
          avgDurationMs: 0,
          avgTokens: 0
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

  const shortcutMeta: Record<string, { desc: string; hoverGlow: string; hoverBg: string; activeColor: string }> = {
    '/admin/users': {
      desc: 'View registered visitors, download CSV exports, and inspect user history.',
      hoverGlow: 'rgba(0, 122, 255, 0.15)',
      hoverBg: 'rgba(0, 122, 255, 0.08)',
      activeColor: '#007aff'
    },
    '/admin/generations': {
      desc: 'Browse generated AI results, inspect models, costs, and delete entries.',
      hoverGlow: 'rgba(0, 255, 122, 0.15)',
      hoverBg: 'rgba(0, 255, 122, 0.08)',
      activeColor: '#00ff7a'
    },
    '/admin/bikes': {
      desc: 'Add or edit active motorcycle models, customize colors, and priorities.',
      hoverGlow: 'rgba(255, 122, 0, 0.15)',
      hoverBg: 'rgba(255, 122, 0, 0.08)',
      activeColor: '#ff7a00'
    },
    '/admin/quiz': {
      desc: 'Configure quiz questionnaires, prioritize answers, and adjust matching weights.',
      hoverGlow: 'rgba(122, 0, 255, 0.15)',
      hoverBg: 'rgba(122, 0, 255, 0.08)',
      activeColor: '#7a00ff'
    },
    '/admin/settings': {
      desc: 'Manage campaign limits, visitor theme modes, and revoke login sessions.',
      hoverGlow: 'rgba(255, 77, 77, 0.15)',
      hoverBg: 'rgba(255, 77, 77, 0.08)',
      activeColor: '#ff4d4d'
    }
  };

  const shortcuts = [
    { label: t.admin.overview.shortcuts.users, path: '/admin/users', icon: '👤', color: '#007aff', keyHint: 'U' },
    { label: t.admin.overview.shortcuts.generations, path: '/admin/generations', icon: '🖼️', color: '#00ff7a', keyHint: 'G' },
    { label: t.admin.overview.shortcuts.bikes, path: '/admin/bikes', icon: '🏍️', color: '#ff7a00', keyHint: 'B' },
    { label: t.admin.overview.shortcuts.quiz, path: '/admin/quiz', icon: '❓', color: '#7a00ff', keyHint: 'Q' },
    { label: t.admin.overview.shortcuts.settings, path: '/admin/settings', icon: '⚙️', color: '#ff4d4d', keyHint: 'S' },
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
    const totalCount = data.reduce((sum, item) => sum + item.count, 0);
    const divisor = totalCount || 1;

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
              const percent = Math.round((item.count / divisor) * 100);
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

      {/* Main KPI Stats Row */}
      <div className={styles.statGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* Total Users */}
        <div className={styles.statCard} style={{
          borderLeft: '4px solid #007aff',
          background: 'linear-gradient(145deg, #0f1624 0%, #080c14 100%)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
          borderRadius: '16px',
          padding: '24px 28px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '16px', right: '20px', fontSize: '24px' }}>👥</div>
          <div className={styles.statValue} style={{ fontSize: '42px', fontWeight: 800, color: 'white', letterSpacing: '-1px', marginBottom: '4px' }}>{stats.users}</div>
          <div className={styles.statLabel} style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{t.admin.overview.totalUsers}</div>
        </div>

        {/* Total AI Generations */}
        <div className={styles.statCard} style={{
          borderLeft: '4px solid #00ff7a',
          background: 'linear-gradient(145deg, #0d1e15 0%, #06100b 100%)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
          borderRadius: '16px',
          padding: '24px 28px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '16px', right: '20px', fontSize: '24px' }}>🖼️</div>
          <div className={styles.statValue} style={{ fontSize: '42px', fontWeight: 800, color: 'white', letterSpacing: '-1px', marginBottom: '4px' }}>{stats.generations}</div>
          <div className={styles.statLabel} style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{t.admin.overview.totalGenerations}</div>
        </div>

        {/* Total Cost (Superadmin Only) */}
        {role === 'superadmin' && (
          <div className={styles.statCard} style={{
            borderLeft: '4px solid #ff9500',
            background: 'linear-gradient(145deg, #24190f 0%, #140d08 100%)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
            borderRadius: '16px',
            padding: '24px 28px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '16px', right: '20px', fontSize: '24px' }}>💵</div>
            <div className={styles.statValue} style={{ fontSize: '42px', fontWeight: 800, color: 'white', letterSpacing: '-1px', marginBottom: '4px' }}>
              ${stats.totalCost.toFixed(3)}
            </div>
            <div className={styles.statLabel} style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Campaign Cost</div>
          </div>
        )}

        {/* Average Latency (Superadmin Only) */}
        {role === 'superadmin' && (
          <div className={styles.statCard} style={{
            borderLeft: '4px solid #ff4d4d',
            background: 'linear-gradient(145deg, #240f0f 0%, #140808 100%)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
            borderRadius: '16px',
            padding: '24px 28px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '16px', right: '20px', fontSize: '24px' }}>⚡</div>
            <div className={styles.statValue} style={{ fontSize: '42px', fontWeight: 800, color: 'white', letterSpacing: '-1px', marginBottom: '4px' }}>
              {(stats.avgDurationMs / 1000).toFixed(1)}s
            </div>
            <div className={styles.statLabel} style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Avg Generation Speed</div>
          </div>
        )}
      </div>

      {/* Secondary Performance Stats Row (Superadmin Only) */}
      {role === 'superadmin' && (
        <div className={styles.statGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {/* Available Bikes */}
          <div className={styles.statCard} style={{
            background: 'linear-gradient(145deg, #0d0d0d 0%, #151515 100%)',
            border: '1px solid rgba(255, 255, 255, 0.03)',
            borderLeft: '4px solid #ff7a00',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div className={styles.statValue} style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{stats.bikes}</div>
              <div className={styles.statLabel} style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{t.admin.overview.availableBikes}</div>
            </div>
            <div style={{ fontSize: '20px' }}>🏍️</div>
          </div>

          {/* Quiz Questions */}
          <div className={styles.statCard} style={{
            background: 'linear-gradient(145deg, #0d0d0d 0%, #151515 100%)',
            border: '1px solid rgba(255, 255, 255, 0.03)',
            borderLeft: '4px solid #7a00ff',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div className={styles.statValue} style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{stats.questions}</div>
              <div className={styles.statLabel} style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{t.admin.overview.quizQuestions}</div>
            </div>
            <div style={{ fontSize: '20px' }}>❓</div>
          </div>

          {/* Average Tokens */}
          <div className={styles.statCard} style={{
            background: 'linear-gradient(145deg, #0d0d0d 0%, #151515 100%)',
            border: '1px solid rgba(255, 255, 255, 0.03)',
            borderLeft: '4px solid #00c6ff',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div className={styles.statValue} style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>
                {Math.round(stats.avgTokens).toLocaleString()}
              </div>
              <div className={styles.statLabel} style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Avg Tokens / Gen</div>
            </div>
            <div style={{ fontSize: '20px' }}>📊</div>
          </div>
        </div>
      )}

      {/* Demographic Insights */}
      <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 600, color: 'white' }}>
        {t.admin.overview.demographicsTitle}
      </h2>
      {loadingDemo ? renderSkeletonSection() : (
        <div className={styles.statsTwoColGrid} style={{ marginBottom: '40px' }}>
          {renderCategoryCard(t.admin.overview.ageRanges, demographics?.ageRanges || [], 'linear-gradient(90deg, #007aff, #00c6ff)', 'rgba(0, 122, 255, 0.15)', '#00c6ff')}
          {renderCategoryCard(t.admin.overview.genders, demographics?.genders || [], 'linear-gradient(90deg, #00ff7a, #00ffcc)', 'rgba(0, 255, 122, 0.15)', '#00ffcc')}
          {renderCategoryCard(t.admin.overview.divisions, demographics?.divisions || [], 'linear-gradient(90deg, #ff7a00, #ffb400)', 'rgba(255, 122, 0, 0.15)', '#ffb400')}
          {renderCategoryCard(t.admin.overview.bikes, demographics?.bikes || [], 'linear-gradient(90deg, #7a00ff, #b500ff)', 'rgba(122, 0, 255, 0.15)', '#b500ff')}
        </div>
      )}

      {/* Quick Shortcuts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <span>🚀</span> {t.admin.overview.shortcutsTitle}
        </h2>
        <span style={{ 
          fontSize: '12px', 
          color: 'rgba(255, 255, 255, 0.35)', 
          background: 'rgba(255, 255, 255, 0.02)', 
          padding: '6px 12px', 
          borderRadius: '20px', 
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ fontSize: '14px' }}>💡</span> Press matching letters on keyboard to navigate instantly
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {shortcuts.filter(s => role === 'superadmin' || ['/admin/users', '/admin/generations'].includes(s.path)).map((s, idx) => {
          const meta = shortcutMeta[s.path] || {
            desc: 'Quick dashboard link.',
            hoverGlow: 'rgba(255,255,255,0.08)',
            hoverBg: 'rgba(255,255,255,0.02)',
            activeColor: '#888'
          };
          const isHovered = hoveredIndex === idx;

          return (
            <Link 
              key={s.path} 
              href={s.path} 
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={styles.statCard}
              style={{ 
                cursor: 'pointer', 
                textDecoration: 'none', 
                display: 'flex', 
                gap: '16px',
                padding: '24px',
                background: isHovered 
                  ? `linear-gradient(145deg, #111111 0%, ${meta.hoverBg} 100%)`
                  : 'linear-gradient(145deg, #0d0d0d 0%, #151515 100%)',
                border: isHovered 
                  ? `1px solid ${s.color}50` 
                  : '1px solid rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isHovered 
                  ? `0 12px 24px -10px ${s.color}60, 0 8px 32px 0 rgba(0, 0, 0, 0.4)` 
                  : '0 4px 20px rgba(0,0,0,0.15)',
                transform: isHovered ? 'translateY(-4px)' : 'none'
              }}
            >
              {/* Icon Container */}
              <div style={{ 
                fontSize: '24px', 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: isHovered ? `${s.color}15` : 'rgba(255, 255, 255, 0.02)', 
                border: isHovered ? `1px solid ${s.color}30` : '1px solid rgba(255, 255, 255, 0.04)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0,
                color: meta.activeColor,
                transition: 'all 0.25s ease'
              }}>
                {s.icon}
              </div>
              
              {/* Content details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'white', fontSize: '15px' }}>{s.label}</span>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: 700,
                      backgroundColor: `${meta.activeColor}15`,
                      color: meta.activeColor,
                      border: `1px solid ${meta.activeColor}30`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {t.admin.overview.shortcuts.management || 'Management'}
                    </span>
                  </div>
                  {/* Keyboard Shortcut Indicator */}
                  <kbd style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: isHovered ? s.color : 'rgba(255, 255, 255, 0.6)',
                    borderColor: isHovered ? `${s.color}50` : 'rgba(255, 255, 255, 0.15)',
                    fontFamily: 'monospace',
                    boxShadow: '0 2px 0 rgba(255, 255, 255, 0.05)',
                    textTransform: 'uppercase',
                    transition: 'all 0.25s ease'
                  }}>
                    {s.keyHint}
                  </kbd>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)', lineHeight: 1.4, margin: 0 }}>
                  {meta.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
