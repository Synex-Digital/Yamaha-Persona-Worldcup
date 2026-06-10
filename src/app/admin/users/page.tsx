'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatTemplate } from '@/lib/i18n/translations';
import styles from '../admin.module.css';

export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userGenerations, setUserGenerations] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchUsers();
  }, [page, limit]);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}`);
    const data = await res.json();
    if (data.users) {
      setUsers(data.users);
      setTotal(data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedUser) {
      fetch(`/api/admin/generations/user?userId=${selectedUser.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.generations) setUserGenerations(data.generations);
        });
    } else {
      setUserGenerations([]);
    }
  }, [selectedUser]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) setSelectedIds([]);
    else setSelectedIds(users.map(u => u.id));
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? users.filter(u => selectedIds.includes(u.id))
      : users;
    
    if (dataToExport.length === 0) return;

    const keys = ['id', 'name', 'phone', 'dob', 'gender', 'division', 'created_at', 'total_generations'];
    const csvContent = "data:text/csv;charset=utf-8,"
      + keys.join(",") + "\n"
      + dataToExport.map(row => keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `yamaha_users_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteGen = async (id: number) => {
    if (confirm(t.admin.users.deleteGenerationConfirm)) {
      await fetch(`/api/admin/generations?id=${id}`, { method: 'DELETE' });
      const res = await fetch(`/api/admin/generations/user?userId=${selectedUser.id}`);
      const data = await res.json();
      if (data.generations) setUserGenerations(data.generations);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const Modal = () => {
    if (!selectedUser) return null;
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <button className={styles.closeBtn} onClick={() => setSelectedUser(null)}>✕</button>
          
          <div className={styles.modalHeader}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: 'white' }}>{selectedUser.name}</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '4px' }}>{t.admin.users.memberSince} {new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </div>
              <div style={{ textAlign: 'right', marginRight: '48px' }}>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#007aff' }}>{selectedUser.phone}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{selectedUser.dob || t.common.notAvailable}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{selectedUser.gender || t.common.notAvailable}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{selectedUser.division || t.common.notAvailable}</div>
              </div>
            </div>
          </div>

          <div className={styles.modalBody}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {t.admin.users.generationHistory} ({userGenerations.length})
            </h3>
            
            <div className={styles.genGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
              {userGenerations.map(gen => (
                <div key={gen.id} className={styles.genCard} style={{ position: 'relative' }}>
                  <a href={`/result/${gen.hash_id}`} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={gen.generated_image_url} 
                      alt="Gen" 
                      className={styles.genImage} 
                      onError={(e) => {
                        (e.target as any).src = "https://via.placeholder.com/400x533?text=Image+Deleted";
                      }}
                    />
                  </a>
                  <div style={{ padding: '12px', fontSize: '11px' }}>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>{gen.bike_model}</div>
                    <div style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '4px' }}>{gen.resolved_bike_color || t.common.notAvailable}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)' }}>{new Date(gen.created_at).toLocaleDateString()}</div>
                  </div>
                  <button 
                    onClick={(e) => { e.preventDefault(); handleDeleteGen(gen.id); }} 
                    className={styles.dangerBtn}
                    style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 6px', fontSize: '10px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {userGenerations.length === 0 && !loading && (
                <div style={{ color: 'rgba(255,255,255,0.1)', textAlign: 'center', gridColumn: 'span 12', padding: '60px' }}>
                  {t.admin.users.noActivity}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <h1>{t.admin.users.title}</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }} className={styles.select} style={{ width: 'auto' }}>
            <option value="20">20 {t.admin.users.perPage}</option>
            <option value="40">40 {t.admin.users.perPage}</option>
            <option value="60">60 {t.admin.users.perPage}</option>
          </select>
          <button className={styles.secondaryBtn} onClick={handleExport}>
            {selectedIds.length > 0 ? `${t.admin.users.exportSelected} (${selectedIds.length})` : t.admin.users.exportAll}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" checked={selectedIds.length === users.length && users.length > 0} onChange={toggleSelectAll} />
                </th>
                <th>{t.admin.users.cols.id}</th>
                <th>{t.admin.users.cols.name}</th>
                <th>{t.admin.users.cols.phone}</th>
                <th>{t.admin.users.cols.ageRange}</th>
                <th>{t.admin.users.cols.gender}</th>
                <th>{t.admin.users.cols.division}</th>
                <th>{t.admin.users.cols.gens}</th>
                <th>{t.admin.users.cols.joined}</th>
                <th>{t.admin.users.cols.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px' }}>{t.admin.users.loading}</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className={selectedIds.includes(u.id) ? styles.rowSelected : ''}>
                    <td>
                      <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} />
                    </td>
                    <td>{u.id}</td>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td>{u.phone}</td>
                    <td>{u.dob || t.common.notAvailable}</td>
                    <td>{u.gender || t.common.notAvailable}</td>
                    <td>{u.division || t.common.notAvailable}</td>
                    <td>{u.total_generations}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => setSelectedUser(u)} className={styles.editBtn}>{t.admin.users.viewDetails}</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles.secondaryBtn}>{t.admin.users.previous}</button>
          <span>{formatTemplate(t.admin.users.pageOf, { page, totalPages: totalPages || 1, total })}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={styles.secondaryBtn}>{t.admin.users.next}</button>
        </div>
      </div>

      {mounted && createPortal(<Modal />, document.body)}
    </div>
  );
}
