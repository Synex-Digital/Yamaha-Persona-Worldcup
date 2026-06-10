'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from '../admin.module.css';

export default function BikesPage() {
  const { t } = useLanguage();
  const [bikes, setBikes] = useState<any[]>([]);
  const [editingBike, setEditingBike] = useState<any | null>(null);
  const [newBike, setNewBike] = useState({
    model_name: '',
    type: '',
    colors: '',
    description: '',
    description_bn: '',
    image_url: ''
  });

  useEffect(() => {
    fetchBikes();
  }, []);

  const fetchBikes = async () => {
    const res = await fetch('/api/admin/bikes');
    const data = await res.json();
    if (data.bikes) setBikes(data.bikes);
  };

  const handleAddBike = async (e: React.FormEvent) => {
    e.preventDefault();
    const bikeData = {
      ...newBike,
      colors: newBike.colors.split(',').map(c => c.trim()).filter(c => c)
    };
    
    const res = await fetch('/api/admin/bikes', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bikeData) 
    });
    
    if (res.ok) {
      setNewBike({
        model_name: '',
        type: '',
        colors: '',
        description: '',
        description_bn: '',
        image_url: ''
      });
      fetchBikes();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to add bike');
    }
  };

  const startEditBike = (bike: any) => {
    let parsedColors = '';
    try {
      const arr = JSON.parse(bike.colors || '[]');
      parsedColors = Array.isArray(arr) ? arr.join(', ') : '';
    } catch {
      parsedColors = '';
    }

    setEditingBike({
      ...bike,
      colors: parsedColors
    });
  };

  const handleUpdateBike = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBike) return;

    const bikeData = {
      ...editingBike,
      colors: editingBike.colors.split(',').map((c: string) => c.trim()).filter((c: string) => c)
    };

    const res = await fetch('/api/admin/bikes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bikeData)
    });

    if (res.ok) {
      setEditingBike(null);
      fetchBikes();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to update bike');
    }
  };

  const handleDeleteBike = async (id: string) => {
    if (confirm(t.admin.bikes.deleteConfirm)) {
      await fetch(`/api/admin/bikes?id=${id}`, { method: 'DELETE' });
      fetchBikes();
    }
  };

  const Icons = {
    Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  };

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <h1>{t.admin.bikes.title}</h1>
      </div>

      {/* Add New Bike Form */}
      <div className={styles.card}>
        <h2 style={{ marginBottom: '20px' }}>{t.admin.bikes.addTitle}</h2>
        <form onSubmit={handleAddBike} className={styles.formGrid}>
          <input 
            placeholder={t.admin.bikes.modelName} 
            value={newBike.model_name} 
            onChange={e => setNewBike({ ...newBike, model_name: e.target.value })} 
            className={styles.input} 
            required 
          />
          <input 
            placeholder={t.admin.bikes.type} 
            value={newBike.type} 
            onChange={e => setNewBike({ ...newBike, type: e.target.value })} 
            className={styles.input} 
            required 
          />
          <input 
            placeholder="Image URL (S3 public link)" 
            value={newBike.image_url} 
            onChange={e => setNewBike({ ...newBike, image_url: e.target.value })} 
            className={styles.input} 
          />
          <input 
            placeholder={t.admin.bikes.colors} 
            value={newBike.colors} 
            onChange={e => setNewBike({ ...newBike, colors: e.target.value })} 
            className={styles.input} 
          />
          <textarea 
            placeholder="English Description" 
            value={newBike.description} 
            onChange={e => setNewBike({ ...newBike, description: e.target.value })} 
            className={`${styles.textarea} ${styles.span2}`} 
            rows={2} 
          />
          <textarea 
            placeholder="Bengali Description (Bangla)" 
            value={newBike.description_bn} 
            onChange={e => setNewBike({ ...newBike, description_bn: e.target.value })} 
            className={`${styles.textarea} ${styles.span2}`} 
            rows={2} 
          />
          <button type="submit" className={`${styles.primaryBtn} ${styles.span2}`}>
            <Icons.Plus /> {t.admin.bikes.registerBike}
          </button>
        </form>
      </div>

      {/* Bikes Inventory List Table */}
      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.admin.bikes.cols.model}</th>
                <th>{t.admin.bikes.cols.type}</th>
                <th>{t.admin.bikes.cols.colors}</th>
                <th style={{ textAlign: 'right' }}>{t.admin.bikes.cols.actions}</th>
              </tr>
            </thead>
            <tbody>
              {bikes.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{b.model_name}</td>
                  <td>{b.type}</td>
                  <td style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {JSON.parse(b.colors || '[]').join(', ')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => startEditBike(b)} className={styles.editBtn}>
                      {t.common.edit}
                    </button>
                    <button onClick={() => handleDeleteBike(b.id)} className={styles.dangerBtn}>
                      {t.common.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Bike Modal */}
      {editingBike && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '600px', height: 'auto', maxHeight: '90vh' }}>
            <button className={styles.closeBtn} onClick={() => setEditingBike(null)}>✕</button>
            <div className={styles.modalHeader}>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Edit Bike Details</h2>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleUpdateBike} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className={styles.statLabel}>Model Name</label>
                  <input 
                    value={editingBike.model_name} 
                    onChange={e => setEditingBike({ ...editingBike, model_name: e.target.value })} 
                    className={styles.input} 
                    required 
                  />
                </div>
                <div>
                  <label className={styles.statLabel}>Type</label>
                  <input 
                    value={editingBike.type} 
                    onChange={e => setEditingBike({ ...editingBike, type: e.target.value })} 
                    className={styles.input} 
                    required 
                  />
                </div>
                <div>
                  <label className={styles.statLabel}>Available Colors (comma separated)</label>
                  <input 
                    value={editingBike.colors} 
                    onChange={e => setEditingBike({ ...editingBike, colors: e.target.value })} 
                    className={styles.input} 
                  />
                </div>
                <div>
                  <label className={styles.statLabel}>Image URL (S3 public link)</label>
                  <input 
                    value={editingBike.image_url || ''} 
                    onChange={e => setEditingBike({ ...editingBike, image_url: e.target.value })} 
                    className={styles.input} 
                  />
                </div>
                <div>
                  <label className={styles.statLabel}>English Description</label>
                  <textarea 
                    value={editingBike.description || ''} 
                    onChange={e => setEditingBike({ ...editingBike, description: e.target.value })} 
                    className={styles.textarea} 
                    rows={2}
                  />
                </div>
                <div>
                  <label className={styles.statLabel}>Bengali Description (Bangla)</label>
                  <textarea 
                    value={editingBike.description_bn || ''} 
                    onChange={e => setEditingBike({ ...editingBike, description_bn: e.target.value })} 
                    className={styles.textarea} 
                    rows={2}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button type="submit" className={styles.primaryBtn} style={{ flex: 1 }}>
                    Save Changes
                  </button>
                  <button type="button" className={styles.secondaryBtn} onClick={() => setEditingBike(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
