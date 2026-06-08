'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from './thank-you.module.css';

export default function ThankYouPage() {
  const { language } = useLanguage();

  const eyebrow = language === 'bn' ? 'Yamaha Bangladesh' : 'Yamaha Bangladesh';
  const title = language === 'bn' ? 'ধন্যবাদ,\nRiders!' : 'Thank You,\nRiders!';
  const message =
    language === 'bn'
      ? 'YamaVerse 2026-এ অসাধারণ অংশগ্রহণের জন্য আপনাদের সবাইকে আন্তরিক ধন্যবাদ। ক্যাম্পেইনের submission এখন বন্ধ। খুব শিগগিরই valid reaction ও contest rules অনুযায়ী winners ঘোষণা করা হবে। Yamaha-এর সাথেই থাকুন।'
      : 'Thank you all for your incredible participation in YamaVerse 2026. Campaign submissions are now closed. Winners will be announced soon based on valid reactions and contest rules. Stay with Yamaha.';
  const homeLabel = language === 'bn' ? 'Yamaverse এ যান' : 'Go to Yamaverse';

  return (
    <main className="page-container">
      <div className={`${styles.shell} fade-in`}>
        <section className={styles.panel}>
          <div className={styles.content}>
            <div className={styles.eyebrow}>{eyebrow}</div>
            <h1 className={styles.title}>{title}</h1>
            <div className={styles.divider} />
            <p className={styles.message}>{message}</p>
            <a
              href="https://yamaverse.online/"
              className="primary-button"
              target="_blank"
              rel="noopener noreferrer"
            >
              {homeLabel}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
