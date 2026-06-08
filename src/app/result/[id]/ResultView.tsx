'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from '../result.module.css';
import ResultActions from './ResultActions';

interface ResultViewProps {
  generatedImageUrl: string;
  name: string;
  modelName: string;
  traitsSummary: string;
  status?: string;
}

export default function ResultView({
  generatedImageUrl,
  name,
  modelName,
  traitsSummary,
  status,
}: ResultViewProps) {
  const { language, t } = useLanguage();
  const isFailed = status === 'failed';
  const personaTitle = language === 'bn' ? `${name}${t.result.personaTitleSuffix}` : `${name}${t.result.personaTitleSuffix}`;

  return (
    <main className="page-container">
      <div className={`${styles.container} fade-in`}>
        {isFailed && (
          <div className={styles.fallbackNotice} style={{
            background: 'rgba(255, 77, 77, 0.08)',
            border: '1px solid rgba(255, 77, 77, 0.2)',
            borderRadius: '16px',
            padding: '20px 24px',
            color: '#ff4d4d',
            fontSize: '14px',
            lineHeight: '1.6',
            marginBottom: '32px',
            maxWidth: '600px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%'
          }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <p style={{ margin: 0, fontWeight: '500' }}>
              {language === 'bn' 
                ? "আমাদের এআই পোর্ট্রেট ইঞ্জিন বর্তমানে অত্যন্ত ব্যস্ত আছে, তাই আমরা আপনার জন্য এই বিশেষ রাইডার ব্যাজটি তৈরি করেছি! অনুগ্রহ করে কিছুক্ষণের মধ্যে আবার চেষ্টা করে আপনার এআই সিনেম্যাটিক ছবি তৈরি করুন।" 
                : "Our AI portrait engine is currently experiencing extremely high demand, so we've custom-crafted your premium Rider Badge! Please feel free to try generating your cinematic face-matched photo again in a few moments."}
            </p>
          </div>
        )}

        <div className={styles.card} id="persona-card">
          <div className={styles.imageWrapper}>
            <img src={generatedImageUrl} alt="AI Persona" className={styles.genImage} />
          </div>
          <div className={styles.content}>
            <div className={styles.badge}>{modelName} {t.result.riderBadgeSuffix}</div>
            <h2 className={styles.personaTitle}>{personaTitle}</h2>
            <p className={styles.copy}>{traitsSummary}</p>
          </div>
        </div>

        <ResultActions imageUrl={generatedImageUrl} userName={name} status={status} />
      </div>
    </main>
  );
}
