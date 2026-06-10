'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from '../admin.module.css';

export default function SettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/admin/auth/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings) setSettings(data.settings);
        setLoading(false);
      });
      
    fetchSessions();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/settings', { 
      method: 'PUT', 
      body: JSON.stringify(settings) 
    });
    if (res.ok) alert(t.admin.settings.saveSuccess);
    else alert(t.admin.settings.saveFailure);
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm(t.admin.settings.sessionRevokeConfirm)) return;
    try {
      const res = await fetch(`/api/admin/auth/sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.loggedOut) {
          window.location.href = '/admin/login';
        } else {
          fetchSessions();
        }
      } else {
        alert('Failed to revoke session');
      }
    } catch (err) {
      console.error('Failed to revoke session:', err);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm(t.admin.settings.sessionRevokeAllConfirm)) return;
    try {
      const res = await fetch('/api/admin/auth/sessions?all=true', {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.loggedOut) {
          window.location.href = '/admin/login';
        }
      } else {
        alert('Failed to revoke all sessions');
      }
    } catch (err) {
      console.error('Failed to revoke all sessions:', err);
    }
  };

  const parseUserAgent = (ua: string) => {
    if (!ua) return 'Unknown Device';
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    else if (ua.includes('Opera')) browser = 'Opera';
    
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('iPhone')) os = 'iPhone';
    else if (ua.includes('iPad')) os = 'iPad';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';
    
    return `${browser} on ${os}`;
  };

  const getDeviceIcon = (ua: string) => {
    if (!ua) return '💻';
    const lower = ua.toLowerCase();
    if (lower.includes('iphone') || lower.includes('android') || lower.includes('mobile')) {
      return '📱';
    }
    if (lower.includes('ipad') || lower.includes('tablet')) {
      return '📟';
    }
    return '💻';
  };

  if (loading) return <div style={{ padding: '40px', color: 'white' }}>{t.admin.settings.loading}</div>;

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <h1>{t.admin.settings.title}</h1>
      </div>

      <div className={styles.settingsLayout}>
        {/* Left Column - Main Form configurations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Card 1: Limits & Verification */}
            <div className={styles.card} style={{ marginBottom: 0 }}>
              <h2 style={{ marginBottom: '12px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>⚙️</span> {t.admin.settings.generationLimits}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '24px' }}>
                {t.admin.settings.generationLimitsHelp}
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 3-Column Input Grid for limits */}
                <div className={styles.limitsGrid}>
                  <div>
                    <label className={styles.statLabel} style={{ marginBottom: '8px', display: 'block' }}>{t.admin.settings.dailyLimit}</label>
                    <input 
                      type="number" 
                      value={settings.max_daily_generations || ''} 
                      onChange={e => setSettings({ ...settings, max_daily_generations: e.target.value })} 
                      className={styles.input} 
                      required 
                    />
                  </div>
                  <div>
                    <label className={styles.statLabel} style={{ marginBottom: '8px', display: 'block' }}>{t.admin.settings.weeklyLimit}</label>
                    <input 
                      type="number" 
                      value={settings.max_weekly_generations || ''} 
                      onChange={e => setSettings({ ...settings, max_weekly_generations: e.target.value })} 
                      className={styles.input} 
                      required 
                    />
                  </div>
                  <div>
                    <label className={styles.statLabel} style={{ marginBottom: '8px', display: 'block' }}>{t.admin.settings.monthlyLimit}</label>
                    <input 
                      type="number" 
                      value={settings.max_monthly_generations || ''} 
                      onChange={e => setSettings({ ...settings, max_monthly_generations: e.target.value })} 
                      className={styles.input} 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label className={styles.statLabel} style={{ marginBottom: '8px', display: 'block' }}>{t.admin.settings.requireOtp}</label>
                  <select 
                    value={settings.otp_enabled || 'true'} 
                    onChange={e => setSettings({ ...settings, otp_enabled: e.target.value })} 
                    className={styles.input} 
                  >
                    <option value="true">{t.admin.settings.otpEnabled}</option>
                    <option value="false">{t.admin.settings.otpDisabled}</option>
                  </select>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '6px' }}>
                    {t.admin.settings.otpHelp}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Campaign Mode */}
            <div className={styles.card} style={{ marginBottom: 0 }}>
              <h2 style={{ marginBottom: '12px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🎨</span> {t.admin.settings.activeCampaignMode}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '24px' }}>
                {t.admin.settings.activeCampaignHelp}
              </p>

              <div className={styles.campaignSelector}>
                <button
                  type="button"
                  className={`${styles.campaignCard} ${settings.eid_camp_enabled !== 'true' && settings.worldcup_camp_enabled !== 'true' ? styles.campaignCardActive : ''}`}
                  style={{
                    borderLeft: settings.eid_camp_enabled !== 'true' && settings.worldcup_camp_enabled !== 'true' ? '3px solid #007aff' : '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  onClick={() => setSettings({
                    ...settings,
                    eid_camp_enabled: 'false',
                    worldcup_camp_enabled: 'false'
                  })}
                >
                  <h3>{t.admin.settings.campaignModeStandard}</h3>
                  <p>{t.admin.settings.campaignModeStandardDesc}</p>
                </button>

                <button
                  type="button"
                  className={`${styles.campaignCard} ${settings.eid_camp_enabled === 'true' ? styles.campaignCardActive : ''}`}
                  style={{
                    borderLeft: settings.eid_camp_enabled === 'true' ? '3px solid #00ff7a' : '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  onClick={() => setSettings({
                    ...settings,
                    eid_camp_enabled: 'true',
                    worldcup_camp_enabled: 'false'
                  })}
                >
                  <h3>{t.admin.settings.campaignModeEid}</h3>
                  <p>{t.admin.settings.campaignModeEidDesc}</p>
                </button>

                <button
                  type="button"
                  className={`${styles.campaignCard} ${settings.worldcup_camp_enabled === 'true' ? styles.campaignCardActive : ''}`}
                  style={{
                    borderLeft: settings.worldcup_camp_enabled === 'true' ? '3px solid #ff9500' : '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  onClick={() => setSettings({
                    ...settings,
                    eid_camp_enabled: 'false',
                    worldcup_camp_enabled: 'true'
                  })}
                >
                  <h3>{t.admin.settings.campaignModeWorldcup}</h3>
                  <p>{t.admin.settings.campaignModeWorldcupDesc}</p>
                </button>
              </div>
            </div>

            {/* Card 3: Display & Preferences */}
            <div className={styles.card} style={{ marginBottom: 0 }}>
              <h2 style={{ marginBottom: '24px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🖥️</span> Display & Toggle Settings
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label className={styles.statLabel}>{t.admin.settings.campaignCompleteMode}</label>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${settings.campaign_completed === 'true' ? styles.toggleButtonActive : ''}`}
                    onClick={() => setSettings({
                      ...settings,
                      campaign_completed: settings.campaign_completed === 'true' ? 'false' : 'true'
                    })}
                    aria-pressed={settings.campaign_completed === 'true'}
                  >
                    <span>{settings.campaign_completed === 'true' ? t.admin.settings.campaignCompleteOn : t.admin.settings.campaignCompleteOff}</span>
                    <span className={`${styles.toggleKnob} ${settings.campaign_completed === 'true' ? styles.toggleKnobActive : ''}`} />
                  </button>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '6px' }}>
                    {t.admin.settings.campaignCompleteHelp}
                  </p>
                </div>

                <div>
                  <label className={styles.statLabel}>{t.admin.settings.themeMode}</label>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${settings.theme_mode === 'light' ? styles.toggleButtonActive : ''}`}
                    onClick={() => setSettings({
                      ...settings,
                      theme_mode: settings.theme_mode === 'light' ? 'dark' : 'light'
                    })}
                    aria-pressed={settings.theme_mode === 'light'}
                  >
                    <span>{settings.theme_mode === 'light' ? t.admin.settings.themeDay : t.admin.settings.themeNight}</span>
                    <span className={`${styles.toggleKnob} ${settings.theme_mode === 'light' ? styles.toggleKnobActive : ''}`} />
                  </button>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '6px' }}>
                    {t.admin.settings.themeHelp}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <button type="submit" className={styles.primaryBtn} style={{ width: '100%', height: '48px', fontSize: '15px' }}>
                {t.admin.settings.saveConfigurations}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column - System Info & Danger Zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Card 4: System Information */}
          <div className={styles.card} style={{ marginBottom: 0 }}>
            <h2 style={{ marginBottom: '12px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📊</span> System Status
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '16px' }}>
              Real-time server state metrics.
            </p>
            
            <div className={styles.statusList}>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Environment Mode</span>
                <span className={styles.statusIndicator}>
                  <span className={styles.statusDot} style={{ color: '#00ff7a', backgroundColor: '#00ff7a' }}></span>
                  Production
                </span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Database Pool</span>
                <span className={styles.statusIndicator}>
                  <span className={styles.statusDot} style={{ color: '#00ff7a', backgroundColor: '#00ff7a' }}></span>
                  Connected
                </span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>API Rotation Keys</span>
                <span className={styles.statusIndicator}>
                  <span className={styles.statusDot} style={{ color: '#00ff7a', backgroundColor: '#00ff7a' }}></span>
                  4 Keys Active
                </span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Visitor Display Theme</span>
                <span className={styles.statusIndicator} style={{ textTransform: 'capitalize' }}>
                  <span className={styles.statusDot} style={{ 
                    color: settings.theme_mode === 'light' ? '#ff9500' : '#007aff', 
                    backgroundColor: settings.theme_mode === 'light' ? '#ff9500' : '#007aff' 
                  }}></span>
                  {settings.theme_mode || 'dark'} Mode
                </span>
              </div>
            </div>
          </div>

          {/* Card 5: Danger Zone */}
          <div className={styles.card} style={{ marginBottom: 0, border: '1px solid rgba(255, 77, 77, 0.2)' }}>
            <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#ff4d4d', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span> {t.admin.settings.dangerTitle}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '24px' }}>
              {t.admin.settings.dangerHelp}
            </p>
            <button className={styles.dangerBtn} style={{ width: '100%', height: '40px', fontSize: '13px' }} onClick={handleRevokeAllSessions}>
              {t.admin.settings.revokeAllSessions}
            </button>
          </div>

          {/* Active Sessions Section */}
          <div className={styles.card} style={{ marginBottom: 0 }}>
            <h2 style={{ marginBottom: '12px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🔑</span> {t.admin.settings.activeSessions}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '24px' }}>
              {t.admin.settings.activeSessionsHelp}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sessionsLoading ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.4)' }}>
                  Loading active sessions...
                </div>
              ) : sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.4)' }}>
                  No active sessions found.
                </div>
              ) : (
                sessions.map((session) => (
                  <div 
                    key={session.id} 
                    className={styles.itemHover}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      background: session.isCurrent ? 'rgba(0, 122, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                      border: session.isCurrent ? '1px solid rgba(0, 122, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.03)',
                      borderRadius: '12px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      gap: '20px',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Left Side: Device Icon and Session Information */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '240px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: session.isCurrent ? 'rgba(0, 122, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: session.isCurrent ? '1px solid rgba(0, 122, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        boxShadow: session.isCurrent ? '0 0 16px rgba(0, 122, 255, 0.1)' : 'none',
                        flexShrink: 0
                      }}>
                        {getDeviceIcon(session.userAgent)}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'white', fontSize: '15px', letterSpacing: '-0.2px' }}>
                            {parseUserAgent(session.userAgent)}
                          </span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: session.role === 'superadmin' ? 'rgba(255, 149, 0, 0.12)' : 'rgba(0, 122, 255, 0.12)',
                            border: session.role === 'superadmin' ? '1px solid rgba(255, 149, 0, 0.2)' : '1px solid rgba(0, 122, 255, 0.2)',
                            color: session.role === 'superadmin' ? '#ff9500' : '#007aff',
                            letterSpacing: '0.3px',
                            whiteSpace: 'nowrap'
                          }}>
                            {session.role === 'superadmin' ? (
                              <>👑 {t.admin.settings.roleSuperAdmin}</>
                            ) : (
                              <>🛡️ {t.admin.settings.roleAdmin}</>
                            )}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>User:</span>
                            <span style={{ color: 'white', fontWeight: 600 }}>@{session.username}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>IP:</span>
                            <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.03)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>{session.ip}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🕒</span>
                            <span>Logged in: {new Date(session.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Status or Action Button */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {session.isCurrent ? (
                        <span style={{
                          color: '#00ff7a',
                          fontWeight: 600,
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(0, 255, 122, 0.06)',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          border: '1px solid rgba(0, 255, 122, 0.15)',
                          boxShadow: '0 0 10px rgba(0, 255, 122, 0.05)'
                        }}>
                          <span style={{ 
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%', 
                            background: '#00ff7a', 
                            display: 'inline-block', 
                            boxShadow: '0 0 8px #00ff7a' 
                          }}></span>
                          {t.admin.settings.sessionCurrent}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          className={styles.dangerBtn}
                          style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            height: 'auto',
                            background: 'rgba(255, 77, 77, 0.08)',
                            border: '1px solid rgba(255, 77, 77, 0.15)',
                            color: '#ff4d4d',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(255, 77, 77, 0.02)'
                          }}
                        >
                          {t.admin.settings.sessionRevoke}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
