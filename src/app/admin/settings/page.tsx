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

      <div className={styles.card} style={{ maxWidth: '600px' }}>
        <h2 style={{ marginBottom: '24px', fontSize: '18px' }}>{t.admin.settings.generationLimits}</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '32px' }}>
          {t.admin.settings.generationLimitsHelp}
        </p>
        
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label className={styles.statLabel}>{t.admin.settings.dailyLimit}</label>
            <input 
              type="number" 
              value={settings.max_daily_generations || ''} 
              onChange={e => setSettings({ ...settings, max_daily_generations: e.target.value })} 
              className={styles.input} 
              required 
            />
          </div>
          <div>
            <label className={styles.statLabel}>{t.admin.settings.weeklyLimit}</label>
            <input 
              type="number" 
              value={settings.max_weekly_generations || ''} 
              onChange={e => setSettings({ ...settings, max_weekly_generations: e.target.value })} 
              className={styles.input} 
              required 
            />
          </div>
          <div>
            <label className={styles.statLabel}>{t.admin.settings.monthlyLimit}</label>
            <input 
              type="number" 
              value={settings.max_monthly_generations || ''} 
              onChange={e => setSettings({ ...settings, max_monthly_generations: e.target.value })} 
              className={styles.input} 
              required 
            />
          </div>

          <div>
            <label className={styles.statLabel}>{t.admin.settings.requireOtp}</label>
            <select 
              value={settings.otp_enabled || 'true'} 
              onChange={e => setSettings({ ...settings, otp_enabled: e.target.value })} 
              className={styles.input} 
            >
              <option value="true">{t.admin.settings.otpEnabled}</option>
              <option value="false">{t.admin.settings.otpDisabled}</option>
            </select>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
              {t.admin.settings.otpHelp}
            </p>
          </div>

          <div>
            <label className={styles.statLabel}>{t.admin.settings.eidCampMode}</label>
            <button
              type="button"
              className={`${styles.toggleButton} ${settings.eid_camp_enabled === 'true' ? styles.toggleButtonActive : ''}`}
              onClick={() => {
                const nextVal = settings.eid_camp_enabled === 'true' ? 'false' : 'true';
                setSettings({
                  ...settings,
                  eid_camp_enabled: nextVal,
                  worldcup_camp_enabled: nextVal === 'true' ? 'false' : settings.worldcup_camp_enabled
                });
              }}
              aria-pressed={settings.eid_camp_enabled === 'true'}
            >
              <span>{settings.eid_camp_enabled === 'true' ? t.admin.settings.eidCampOn : t.admin.settings.eidCampOff}</span>
              <span className={`${styles.toggleKnob} ${settings.eid_camp_enabled === 'true' ? styles.toggleKnobActive : ''}`} />
            </button>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
              {t.admin.settings.eidCampHelp}
            </p>
          </div>

          <div>
            <label className={styles.statLabel}>{t.admin.settings.worldcupCampMode}</label>
            <button
              type="button"
              className={`${styles.toggleButton} ${settings.worldcup_camp_enabled === 'true' ? styles.toggleButtonActive : ''}`}
              onClick={() => {
                const nextVal = settings.worldcup_camp_enabled === 'true' ? 'false' : 'true';
                setSettings({
                  ...settings,
                  worldcup_camp_enabled: nextVal,
                  eid_camp_enabled: nextVal === 'true' ? 'false' : settings.eid_camp_enabled
                });
              }}
              aria-pressed={settings.worldcup_camp_enabled === 'true'}
            >
              <span>{settings.worldcup_camp_enabled === 'true' ? t.admin.settings.worldcupCampOn : t.admin.settings.worldcupCampOff}</span>
              <span className={`${styles.toggleKnob} ${settings.worldcup_camp_enabled === 'true' ? styles.toggleKnobActive : ''}`} />
            </button>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
              {t.admin.settings.worldcupCampHelp}
            </p>
          </div>

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
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
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
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
              {t.admin.settings.themeHelp}
            </p>
          </div>
          
          <div style={{ marginTop: '12px' }}>
            <button type="submit" className={styles.primaryBtn}>{t.admin.settings.saveConfigurations}</button>
          </div>
        </form>
      </div>

      <div className={styles.card} style={{ maxWidth: '600px', border: '1px solid rgba(255, 77, 77, 0.2)' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#ff4d4d' }}>{t.admin.settings.dangerTitle}</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>
          {t.admin.settings.dangerHelp}
        </p>
        <button className={styles.dangerBtn} onClick={() => alert(t.admin.settings.revokeInfo)}>
          {t.admin.settings.revokeAllSessions}
        </button>
      </div>
    </div>
  );
}
