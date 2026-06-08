'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from './page.module.css';

export default function HomeClient() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [step, setStep] = useState<'lead' | 'otp'>('lead');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('25-34');
  const [gender, setGender] = useState('Male');
  const [division, setDivision] = useState('Dhaka');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem('isAuthenticated') === 'true') {
      router.push('/quiz');
    }
  }, [router]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !dob || !gender || !division) {
      setError(t.home.fillAllFields);
      return;
    }

    setLoading(true);
    setError('');

    const cleaned = phone.replace(/[^\d+]/g, '');
    let formattedPhone = '';

    if (/^01[3-9]\d{8}$/.test(cleaned)) {
      formattedPhone = `+88${cleaned}`;
    } else if (/^8801[3-9]\d{8}$/.test(cleaned)) {
      formattedPhone = `+${cleaned}`;
    } else if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
      formattedPhone = cleaned;
    } else {
      setLoading(false);
      setError(t.api.invalidPhone);
      return;
    }

    setPhone(formattedPhone);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: formattedPhone, dob, gender, division, lang: language }),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.bypassOtp) {
          localStorage.setItem('isAuthenticated', 'true');
          router.push('/quiz');
        } else {
          setStep('otp');
        }
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch {
      setError(t.home.networkError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) {
      setError(t.home.invalidOtpLength);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, dob, gender, division, otp, lang: language }),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('isAuthenticated', 'true');
        router.push('/quiz');
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch {
      setError(t.home.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-container">
      <div className={`${styles.card} fade-in`}>
        {step === 'lead' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className={styles.badge}>{t.home.badge}</div>
              <h3 className={styles.title}>{t.home.title}</h3>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleSendOtp}>
              <div className={styles.formGroup}>
                <label>{t.home.fullName}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.home.placeholderName}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t.home.ageRange}</label>
                <select value={dob} onChange={(e) => setDob(e.target.value)} required>
                  <option value="" disabled>{t.home.selectAge}</option>
                  {t.home.ageRanges.map((range) => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t.home.phoneNumber}</label>
                <input
                  type="tel"
                  maxLength={14}
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/(?!^\+)[^\d]/g, '');
                    setPhone(val);
                  }}
                  placeholder={t.home.placeholderPhone}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t.home.gender}</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="" disabled>{t.home.selectGender}</option>
                  <option value="Male">{t.home.male}</option>
                  <option value="Female">{t.home.female}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t.home.division}</label>
                <select value={division} onChange={(e) => setDivision(e.target.value)} required>
                  <option value="" disabled>{t.home.selectDivision}</option>
                  {t.home.divisions.map((divisionOption) => (
                    <option key={divisionOption} value={divisionOption}>{divisionOption}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? t.home.processing : t.home.continueButton}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <div className={styles.otpContainer}>
            <h1 style={{ fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>{t.home.securityTitle}</h1>
            <p className={styles.subtitle} style={{ fontSize: '14px', marginBottom: '32px' }}>
              {t.home.otpInstructionPrefix} <b>{phone}</b>
            </p>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleVerifyOtp}>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  maxLength={4}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '24px' }}
                  required
                />
              </div>
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? t.home.verifying : t.home.verifyIdentity}
              </button>
            </form>
            <div className={styles.otpActions}>
              <button className={styles.resendBtn} onClick={() => setStep('lead')} disabled={loading}>
                {t.home.changeNumber}
              </button>
              <button className={styles.resendBtn} onClick={handleSendOtp} disabled={loading} style={{ marginLeft: '16px' }}>
                {t.home.resendOtp}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
