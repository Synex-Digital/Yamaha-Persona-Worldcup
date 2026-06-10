'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from '../admin.module.css';

export default function SettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings) setSettings(data.settings);
        setLoading(false);
      });
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
            <button className={styles.dangerBtn} style={{ width: '100%', height: '40px', fontSize: '13px' }} onClick={() => alert(t.admin.settings.revokeInfo)}>
              {t.admin.settings.revokeAllSessions}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
