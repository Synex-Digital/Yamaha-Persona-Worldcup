'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from '../result.module.css';

interface ResultActionsProps {
  imageUrl: string;
  userName: string;
  status?: string;
}

export default function ResultActions({ imageUrl, userName, status }: ResultActionsProps) {
  const { t } = useLanguage();
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'done'>('idle');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const proxyImageUrl = `/api/download?url=${encodeURIComponent(imageUrl)}`;

  const handleDownload = () => {
    if (downloadState !== 'idle') return;
    setDownloadState('downloading');
    
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = proxyImageUrl;
      link.download = `Yamaha_Persona_${userName.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 3000);
    }, 800);
  };

  const shareText = t.result.shareText;
  const shareTitle = `Yamaha Persona - ${userName}`;

  const getShareUrl = () => window.location.href;

  const openShareWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=720,height=640');
    setShowShareMenu(false);
  };

  const fetchShareFile = async () => {
    const response = await fetch(proxyImageUrl);
    const blob = await response.blob();
    return new File([blob], `Yamaha_Persona_${userName.replace(/\s+/g, '_')}.jpg`, {
      type: blob.type || 'image/jpeg',
    });
  };

  const shareOnX = () => {
    const shareUrl = getShareUrl();
    const url = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url);
  };

  const shareOnFacebook = () => {
    const shareUrl = getShareUrl();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url);
  };

  const fallbackInstagramShare = () => {
    const link = document.createElement('a');
    link.href = proxyImageUrl;
    link.download = `Yamaha_Persona_${userName.replace(/\s+/g, '_')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    alert(t.result.instagramFallback);
  };

  const shareOnInstagram = async () => {
    try {
      if (navigator.share) {
        const shareFile = await fetchShareFile();
        if (navigator.canShare?.({ files: [shareFile] })) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            files: [shareFile],
          });
          return;
        }

        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: getShareUrl(),
        });
        return;
      }

      fallbackInstagramShare();
    } catch (err) {
      console.log('Instagram share failed:', err);
      fallbackInstagramShare();
    } finally {
      setShowShareMenu(false);
    }
  };

  return (
    <div className={styles.actionsGrid}>
      {status !== 'failed' && (
        <div className={styles.shareWrapper}>
          <button 
            className={`${styles.actionBtn} ${styles.primaryBtn}`} 
            onClick={() => setShowShareMenu(!showShareMenu)}
            style={{ width: '100%' }}
          >
            <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            {t.result.sharePersona}
          </button>

          {showShareMenu && (
            <div className={styles.shareDropdown}>
              <button className={styles.shareDropdownBtn} onClick={shareOnX}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"></path><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path></svg>
                {t.result.shareOnX}
              </button>
              <button className={styles.shareDropdownBtn} onClick={shareOnFacebook}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                {t.result.shareOnFacebook}
              </button>
              <button className={styles.shareDropdownBtn} onClick={shareOnInstagram}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                {t.result.shareOnInstagram}
              </button>
            </div>
          )}
        </div>
      )}

      <div className={styles.rowActions} style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button 
          className={styles.actionBtn} 
          onClick={handleDownload}
          disabled={downloadState === 'downloading'}
        >
          {downloadState === 'idle' && (
            <>
              <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              {t.result.download}
            </>
          )}
          {downloadState === 'downloading' && (
            <>
              <div className={styles.spinnerSmall}></div>
              {t.result.saving}
            </>
          )}
          {downloadState === 'done' && (
            <>
              <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              {t.result.saved}
            </>
          )}
        </button>

        {status === 'failed' && (
          <button 
            className={styles.actionBtn} 
            onClick={() => window.location.href = '/upload'}
            style={{ 
              background: 'linear-gradient(135deg, #ff4d4d 0%, #cc0000 100%)', 
              color: 'white', 
              fontWeight: '700',
              boxShadow: '0 4px 12px rgba(255, 77, 77, 0.3)'
            }}
          >
            <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Try AI Again
          </button>
        )}

        <button 
          className={styles.actionBtn} 
          onClick={() => window.location.href = '/'}
        >
          <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          {t.result.home}
        </button>
      </div>
    </div>
  );
}
