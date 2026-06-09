'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from './quiz.module.css';

export default function Quiz() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [campaignStatusLoaded, setCampaignStatusLoaded] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setSearchQuery('');
  }, [currentQ]);

  useEffect(() => {
    async function checkCampaignStatus() {
      try {
        const res = await fetch('/api/campaign-status', {
          cache: 'no-store',
        });
        const data = await res.json();

        if (data.campaignCompleted) {
          router.replace('/thank-you');
          return false;
        }
      } catch (error) {
        console.error('Failed to fetch campaign status', error);
      } finally {
        setCampaignStatusLoaded(true);
      }

      return true;
    }

    // If not authenticated, kick back to OTP page
    async function initQuiz() {
      const canContinue = await checkCampaignStatus();
      if (!canContinue) return;

      if (localStorage.getItem('isAuthenticated') !== 'true') {
        router.push('/');
        return;
      }

      try {
        const res = await fetch(`/api/quiz/questions?lang=${language}`);
        const data = await res.json();
        if (data.questions) {
          setQuestions(data.questions);

          const savedState = sessionStorage.getItem('quizState');
          if (savedState) {
            const parsed = JSON.parse(savedState);
            setCurrentQ(parsed.currentQ || 0);
            setAnswers(parsed.answers || []);
            setSelectedOption(parsed.selectedOption || null);
          }
        }
      } catch (e) {
        console.error("Failed to load questions", e);
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    }

    initQuiz();
  }, [router, language]);

  // Save state to sessionStorage on every change
  useEffect(() => {
    if (isInitialized) {
      sessionStorage.setItem('quizState', JSON.stringify({ currentQ, answers, selectedOption }));
    }
  }, [currentQ, answers, selectedOption, isInitialized]);

  // Prevent accidental reload during loading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (submitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [submitting]);

  const handleNext = async () => {
    if (selectedOption === null) return;

    const newAnswers = [...answers];
    newAnswers[currentQ] = selectedOption;

    if (currentQ < questions.length - 1) {
      setAnswers(newAnswers);
      setSelectedOption(newAnswers[currentQ + 1] || null);
      setCurrentQ(currentQ + 1);
    } else {
      setAnswers(newAnswers);
      setSubmitting(true);
      try {
        const res = await fetch('/api/quiz/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ traits: newAnswers })
        });
        const data = await res.json();

        if (res.ok && data.persona) {
          sessionStorage.setItem('quizResult', JSON.stringify({
            persona: data.persona
          }));
          router.push('/upload');
        } else {
          alert(data.error || t.quiz.personaFailed);
          setSubmitting(false);
        }
      } catch {
        alert(t.quiz.networkError);
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentQ > 0) {
      const prevQ = currentQ - 1;
      setCurrentQ(prevQ);
      setSelectedOption(answers[prevQ] || null);
    } else {
      router.push('/');
    }
  };

  if (!campaignStatusLoaded || loading || questions.length === 0) {
    return (
      <main className={styles.container}>
        <div style={{ textAlign: 'center', marginTop: '100px' }} className="fade-in">
          <h2 className={styles.questionTitle}>{t.quiz.loadingQuiz}</h2>
          {campaignStatusLoaded && !loading && questions.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>{t.quiz.loadFailed}</p>
          )}
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      </main>
    );
  }

  if (submitting) {
    return (
      <main className={styles.container}>
        <div style={{ textAlign: 'center', marginTop: '100px' }} className="fade-in">
          <h2 className={styles.questionTitle}>{t.quiz.analyzingTraits}</h2>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      </main>
    );
  }

  const question = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;
  const isCompact = question?.options?.length > 15;
  const filteredOptions = isCompact
    ? question.options.filter((opt: any) =>
        opt.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : question?.options || [];

  const getPremiumIcon = (iconName: string | undefined, isSelected: boolean) => {
    const color = isSelected ? "white" : "var(--text-secondary)";

    switch (iconName) {
      case 'Weekend Explorer':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>;
      case 'Daily Commuter':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="15" y2="22"></line><line x1="12" y1="6" x2="12" y2="6.01"></line><line x1="12" y1="10" x2="12" y2="10.01"></line><line x1="12" y1="14" x2="12" y2="14.01"></line><line x1="12" y1="18" x2="12" y2="18.01"></line></svg>;
      case 'Speed Enthusiast':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>;
      case 'Urban Nightscapes':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
      case 'Coastal Highways':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;
      case 'Mountain Trails':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l4 8 5-5 5 15H2L8 3z"></path></svg>;
      case 'Iconic Blue':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>;
      case 'Dark Side':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
      case 'Dream Bike':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
      case 'Speed Star':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>;
      case 'City Racer':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-4"></path></svg>;
      case 'Mountain Trekker':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20l6-10 4 6 3-4 5 8"></path></svg>;
      case 'Off Road Ruler':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="18" r="3"></circle><path d="M8 18h7l-2-6h-4"></path><path d="M13 12l2-3h3"></path></svg>;
      case 'Beach Rider':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0"></path><circle cx="18" cy="6" r="3"></circle></svg>;
      case 'CityLife':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="10" width="5" height="11"></rect>
            <rect x="10" y="4" width="5" height="17"></rect>
            <rect x="17" y="7" width="4" height="14"></rect>
            <path d="M4 14h2"></path>
            <path d="M4 17h2"></path>
            <path d="M11 8h2"></path>
            <path d="M11 11h2"></path>
            <path d="M11 14h2"></path>
            <path d="M18 11h1"></path>
            <path d="M18 14h1"></path>
          </svg>
        );
      case 'Beaches':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0"></path><circle cx="18" cy="6" r="3"></circle><path d="M7 17c.7-4 2-7 5-10"></path><path d="M5 9c2-1 4-1 6 1"></path></svg>;
      case 'Cyber City':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V9l4-4 4 4v12"></path><path d="M12 21V7l4-4 4 4v14"></path><path d="M7 13h2"></path><path d="M15 11h2"></path><path d="M15 15h2"></path><path d="M3 21h18"></path></svg>;
      case 'Hills':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20l6-10 4 6 3-4 5 8"></path><path d="M4 18c4-3 8-3 12-1"></path></svg>;
      case 'Off-Roads':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="18" r="3"></circle><path d="M8 18h7l-2-6h-4"></path><path d="M13 12l2-3h3"></path><path d="M3 21c3-2 6-2 9 0s6 2 9 0"></path></svg>;
      default:
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>;
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.topNav}>
        <button className={styles.backButton} onClick={handleBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          {t.common.back}
        </button>
      </div>

      <div className={styles.header}>
        <h1 className={styles.questionTitle}>{question.title}</h1>
        <p className={styles.subtitle}>{t.quiz.subtitle}</p>

        <div className={styles.stepIndicator}>
          {t.quiz.step} {currentQ + 1} <span className={styles.stepMuted}>{t.quiz.of} {questions.length}</span>
        </div>

        <div className={styles.progressBarContainer}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className={styles.questionWrapper} key={currentQ}>
        {isCompact && (
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder={language === 'bn' ? 'দল খুঁজুন...' : 'Search country...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        )}
        <div className={`${styles.optionsList} ${isCompact ? styles.compactGrid : ''}`}>
          {filteredOptions.map((opt: any) => {
            const isSelected = selectedOption === opt.id;
            return (
              <button
                key={opt.id}
                className={`${styles.optionCard} ${isSelected ? styles.selected : ''} ${isCompact ? styles.compactCard : ''}`}
                onClick={() => setSelectedOption(opt.id)}
              >
                {!isCompact && (
                  <div className={styles.iconWrapper}>
                    {getPremiumIcon(opt.icon || '', isSelected)}
                  </div>
                )}
                <div className={styles.optionTextContent}>
                  <div className={styles.optionTitle} style={{ textAlign: isCompact ? 'center' : 'left' }}>{opt.title}</div>
                  {!isCompact && <div className={styles.optionDesc}>{opt.desc}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.bottomAction}>
        <button
          className={`${styles.nextButton} ${selectedOption ? styles.active : ''}`}
          onClick={handleNext}
          disabled={!selectedOption}
        >
          {currentQ < questions.length - 1 ? t.quiz.next : t.quiz.calculatePersona}
        </button>
      </div>
    </main>
  );
}
