'use client';

import React, { useState, useEffect } from 'react';
import { formatTemplate } from '@/lib/i18n/translations';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from '../admin.module.css';

export default function GenerationsPage() {
  const { t } = useLanguage();
  const [generations, setGenerations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [role, setRole] = useState<'admin' | 'superadmin'>('admin');
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [stats, setStats] = useState<{
    totalCount: number;
    totalCost: number;
    avgDurationMs: number;
    avgTokens: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const formatDuration = (ms: number) => {
    if (ms === undefined || ms === null) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(2)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(1);
    return `${minutes}m ${remainingSeconds}s`;
  };

  useEffect(() => {
    fetchRole();
  }, []);

  useEffect(() => {
    fetchGenerations();
  }, [page, limit]);

  useEffect(() => {
    if (role === 'superadmin') {
      fetchStats();
    }
  }, [role]);

  const fetchRole = async () => {
    try {
      const res = await fetch('/api/admin/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setRole(data.user.role || 'admin');
      }
    } catch (e) {
      console.error('Fetch role error:', e);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/generations/stats');
      const data = await res.json();
      if (!data.error) {
        setStats(data);
      }
    } catch (e) {
      console.error('Fetch stats error:', e);
    }
    setStatsLoading(false);
  };

  const fetchGenerations = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/generations?page=${page}&limit=${limit}`);
    const data = await res.json();
    if (data.generations) {
      setGenerations(data.generations);
      setTotal(data.total);
    }
    setLoading(false);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === generations.length) setSelectedIds([]);
    else setSelectedIds(generations.map(g => g.id));
  };

  const toggleDetails = (id: number) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDelete = async (id: number) => {
    if (confirm(t.admin.generations.deleteConfirm)) {
      await fetch(`/api/admin/generations?id=${id}`, { method: 'DELETE' });
      fetchGenerations();
    }
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0
      ? generations.filter(g => selectedIds.includes(g.id))
      : generations;

    if (dataToExport.length === 0) return;

    const keys = ['id', 'user_name', 'user_phone', 'gender', 'division', 'bike_model', 'generated_image_url', 'resolved_bike_color', 'created_at'];
    if (role === 'superadmin') {
      keys.push('total_cost', 'total_duration_ms');
    }

    const csvContent = "data:text/csv;charset=utf-8,"
      + keys.join(",") + "\n"
      + dataToExport.map(row => keys.map(k => {
          if (k === 'total_cost') {
            return `"${(row.performance_meta?.totalCost || 0).toFixed(6)}"`;
          }
          if (k === 'total_duration_ms') {
            return `"${row.performance_meta?.totalDurationMs || ''}"`;
          }
          return `"${String(row[k] || '').replace(/"/g, '""')}"`;
        }).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `yamaha_generations_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <h1>{t.admin.generations.title}</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }} className={styles.select} style={{ width: 'auto' }}>
            <option value="20">20 {t.admin.generations.perPage}</option>
            <option value="40">40 {t.admin.generations.perPage}</option>
            <option value="60">60 {t.admin.generations.perPage}</option>
          </select>
          <button className={styles.secondaryBtn} onClick={handleExport}>
            {selectedIds.length > 0 ? `${t.admin.generations.exportSelected} (${selectedIds.length})` : t.admin.generations.exportAll}
          </button>
        </div>
      </div>

      {role === 'superadmin' && (
        <div className={styles.statGrid} style={{ marginBottom: '24px' }}>
          {statsLoading ? (
            <>
              <div className={styles.skeletonCard}>
                <div className={styles.skeletonValue}></div>
                <div className={styles.skeletonLabel}></div>
              </div>
              <div className={styles.skeletonCard}>
                <div className={styles.skeletonValue}></div>
                <div className={styles.skeletonLabel}></div>
              </div>
              <div className={styles.skeletonCard}>
                <div className={styles.skeletonValue}></div>
                <div className={styles.skeletonLabel}></div>
              </div>
            </>
          ) : stats ? (
            <>
              <div className={styles.statCard}>
                <div className={styles.statValue}>
                  ${stats.totalCost.toFixed(4)}
                </div>
                <div className={styles.statLabel}>Lifetime Total Cost (USD)</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>
                  {formatDuration(stats.avgDurationMs)}
                </div>
                <div className={styles.statLabel}>Lifetime Avg Gen Speed</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>
                  {Math.round(stats.avgTokens).toLocaleString()}
                </div>
                <div className={styles.statLabel}>Lifetime Avg Tokens / Gen</div>
              </div>
            </>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.4)', gridColumn: 'span 3', textAlign: 'center', padding: '20px' }}>
              Lifetime stats not available
            </div>
          )}
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" checked={selectedIds.length === generations.length && generations.length > 0} onChange={toggleSelectAll} />
              </th>
              <th>{t.admin.generations.cols.image}</th>
              <th>{t.admin.generations.cols.user}</th>
              <th>{t.admin.generations.cols.phone}</th>
              <th>{t.admin.generations.cols.gender}</th>
              <th>{t.admin.generations.cols.division}</th>
              <th>{t.admin.generations.cols.bike}</th>
              <th>{t.admin.generations.cols.color}</th>
              <th>{t.admin.generations.cols.date}</th>
              {role === 'superadmin' && <th>AI Metrics</th>}
              <th>{t.admin.generations.cols.actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={role === 'superadmin' ? 11 : 10} style={{ textAlign: 'center', padding: '40px' }}>{t.admin.generations.loading}</td></tr>
            ) : (
              generations.map(gen => (
                <React.Fragment key={gen.id}>
                  <tr className={selectedIds.includes(gen.id) ? styles.rowSelected : ''}>
                    <td>
                      <input type="checkbox" checked={selectedIds.includes(gen.id)} onChange={() => toggleSelect(gen.id)} />
                    </td>
                    <td>
                      <a href={`/result/${gen.hash_id}`} target="_blank" rel="noopener noreferrer">
                        <img
                          src={gen.generated_image_url}
                          alt="Gen"
                          style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover', background: '#222' }}
                          onError={(e) => {
                            (e.target as any).src = "https://via.placeholder.com/24?text=X";
                          }}
                        />
                      </a>
                    </td>
                    <td style={{ fontWeight: 600 }}>{gen.user_name}</td>
                    <td>{gen.user_phone}</td>
                    <td>{gen.gender || 'N/A'}</td>
                    <td>{gen.division || 'N/A'}</td>
                    <td>
                      <span className={styles.badge} style={{ background: 'rgba(0,122,255,0.1)', color: '#007aff' }}>
                        {gen.bike_model}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{gen.resolved_bike_color || 'N/A'}</td>
                    <td style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                      {new Date(gen.created_at).toLocaleString()}
                    </td>
                    {role === 'superadmin' && (
                      <td>
                        {gen.performance_meta ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10px' }}>
                            <span style={{ color: '#00ff7a', fontWeight: 'bold' }}>
                              ${gen.performance_meta.totalCost.toFixed(5)}
                            </span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                              {formatDuration(gen.performance_meta.totalDurationMs)}
                            </span>
                            <button 
                              onClick={() => toggleDetails(gen.id)} 
                              className={styles.secondaryBtn} 
                              style={{ padding: '2px 4px', fontSize: '9px', marginTop: '4px', alignSelf: 'flex-start', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                            >
                              {expandedIds.includes(gen.id) ? 'Hide Logs' : 'View Logs'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>N/A</span>
                        )}
                      </td>
                    )}
                    <td>
                      <button onClick={() => handleDelete(gen.id)} className={styles.dangerBtn} style={{ padding: '4px 8px', fontSize: '10px' }}>{t.common.delete}</button>
                    </td>
                  </tr>
                  {role === 'superadmin' && expandedIds.includes(gen.id) && gen.performance_meta && (
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <td colSpan={11} style={{ padding: '16px', borderTop: 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'rgba(255,255,255,0.85)', fontSize: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                              <strong style={{ display: 'block', marginBottom: '6px', color: '#ff7a00' }}>Original Prompt:</strong>
                              <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                                {gen.final_prompt || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <strong style={{ display: 'block', marginBottom: '6px', color: '#00ff7a' }}>Optimized Prompt:</strong>
                              <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                                {gen.performance_meta.error ? 'Generation Failed' : (gen.performance_meta.optimizedPromptText || gen.final_prompt || 'N/A')}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
                            <div>
                              <strong style={{ display: 'block', marginBottom: '4px' }}>API Cost & Token Details:</strong>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                                <tbody>
                                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <td style={{ padding: '4px 0' }}>Text Model:</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{gen.performance_meta.textModel}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <td style={{ padding: '4px 0' }}>Text API Key Index:</td>
                                    <td style={{ textAlign: 'right' }}>
                                      {gen.performance_meta.textApiKeyIndex !== undefined ? gen.performance_meta.textApiKeyIndex : 'N/A'}
                                    </td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '4px 0' }}>Text Tokens (In/Out):</td>
                                    <td style={{ textAlign: 'right' }}>
                                      {gen.performance_meta.textTokens 
                                        ? `${gen.performance_meta.textTokens.prompt.toLocaleString()} / ${gen.performance_meta.textTokens.candidates.toLocaleString()}` 
                                        : 'N/A'}
                                    </td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '4px 0' }}>Text Cost:</td>
                                    <td style={{ textAlign: 'right', color: '#00ff7a' }}>
                                      ${(gen.performance_meta.textCost || 0).toFixed(6)}
                                    </td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <td style={{ padding: '4px 0' }}>Image Model:</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{gen.performance_meta.imageModel}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <td style={{ padding: '4px 0' }}>Image API Key Index:</td>
                                    <td style={{ textAlign: 'right' }}>
                                      {gen.performance_meta.imageApiKeyIndex !== undefined ? gen.performance_meta.imageApiKeyIndex : 'N/A'}
                                    </td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '4px 0' }}>Image Tokens (In/Out):</td>
                                    <td style={{ textAlign: 'right' }}>
                                      {gen.performance_meta.imageTokens 
                                        ? `${gen.performance_meta.imageTokens.prompt.toLocaleString()} / ${(gen.performance_meta.imageTokens.candidates || 0).toLocaleString()}` 
                                        : 'N/A'}
                                    </td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '4px 0' }}>Image Cost:</td>
                                    <td style={{ textAlign: 'right', color: '#00ff7a' }}>
                                      ${(gen.performance_meta.imageCost || 0).toFixed(6)}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Total API Cost:</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#00ff7a' }}>
                                      ${(gen.performance_meta.totalCost || 0).toFixed(6)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            <div>
                              <strong style={{ display: 'block', marginBottom: '4px' }}>Latency Checkpoints:</strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '10px' }}>
                                {gen.performance_meta.checkpoints && Object.entries(gen.performance_meta.checkpoints).map(([key, ms]: any) => (
                                  <div key={key} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{key}:</span> <strong style={{ color: '#007aff' }}>{formatDuration(ms)}</strong>
                                  </div>
                                ))}
                                <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4px', paddingTop: '4px' }}>
                                  <strong>Total Time:</strong> <span style={{ color: '#00ff7a', fontWeight: 'bold' }}>{formatDuration(gen.performance_meta.totalDurationMs)}</span>
                                </div>
                              </div>
                              {gen.performance_meta.error && (
                                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,77,77,0.1)', borderLeft: '3px solid #ff4d4d', borderRadius: '4px', color: '#ff4d4d', fontSize: '11px' }}>
                                  <strong>Error:</strong> {gen.performance_meta.error}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
        </div>

        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles.secondaryBtn}>{t.admin.generations.previous}</button>
          <span>{formatTemplate(t.admin.generations.pageOf, { page, totalPages: totalPages || 1, total })}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={styles.secondaryBtn}>{t.admin.generations.next}</button>
        </div>
      </div>
    </div>
  );
}
