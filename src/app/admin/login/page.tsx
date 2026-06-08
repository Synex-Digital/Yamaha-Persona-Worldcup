'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from '../admin.module.css';

export default function AdminLogin() {
  const router = useRouter();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/admin');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError(t.admin.login.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #050505 0%, #111 100%)',
      padding: '20px'
    }}>
      <div className={styles.card} style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '40px', height: '40px', background: '#007aff', borderRadius: '12px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🔐</div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{t.admin.login.title}</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>{t.admin.login.subtitle}</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', padding: '12px', borderRadius: '12px', fontSize: '13px', marginBottom: '24px', textAlign: 'center', border: '1px solid rgba(255, 77, 77, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className={styles.statLabel} style={{ marginBottom: '8px', display: 'block' }}>{t.admin.login.username}</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className={styles.input}
              placeholder={t.admin.login.usernamePlaceholder}
              required 
            />
          </div>
          <div>
            <label className={styles.statLabel} style={{ marginBottom: '8px', display: 'block' }}>{t.admin.login.password}</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className={styles.input}
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className={styles.primaryBtn} style={{ marginTop: '12px', height: '48px' }} disabled={loading}>
            {loading ? t.admin.login.authenticating : t.admin.login.signIn}
          </button>
        </form>
      </div>
    </div>
  );
}
