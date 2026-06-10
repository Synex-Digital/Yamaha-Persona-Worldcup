'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from '../admin.module.css';

interface BikeMapping {
  bike_id: number;
  model_name: string;
  weight_percent: number;
  priority_order: number;
  is_active: boolean;
}

const EMPTY_OPTION = {
  option_text: '',
  option_text_bn: '',
  option_desc: '',
  option_desc_bn: '',
  icon_name: '',
  metadata: {},
  is_active: true,
  bike_mappings: [] as BikeMapping[],
};

export default function QuizManagerPage() {
  const { t } = useLanguage();
  const [bikes, setBikes] = useState<any[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [quizOptions, setQuizOptions] = useState<any[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editingOption, setEditingOption] = useState<any>(null);
  const [newQuestion, setNewQuestion] = useState({ question_text: '', question_text_bn: '', question_type: 'behavior', order_index: 0 });
  const [newOption, setNewOption] = useState<any>(EMPTY_OPTION);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [bRes, qRes] = await Promise.all([
      fetch('/api/admin/bikes'),
      fetch('/api/admin/quiz/questions'),
    ]);
    const b = await bRes.json();
    const q = await qRes.json();
    if (b.bikes) setBikes(b.bikes);
    if (q.questions) setQuizQuestions(q.questions);
  };

  const fetchOptions = async (questionId: number) => {
    const res = await fetch(`/api/admin/quiz/options?questionId=${questionId}`);
    const data = await res.json();
    if (data.options) setQuizOptions(data.options);
  };

  useEffect(() => {
    if (selectedQuestion) {
      fetchOptions(selectedQuestion.id);
    }
  }, [selectedQuestion]);

  const totalActiveWeight = (mappings: BikeMapping[]) =>
    mappings.filter((mapping) => mapping.is_active !== false).reduce((sum, mapping) => sum + Number(mapping.weight_percent || 0), 0);

  const resetOptionForm = () => {
    setEditingOption(null);
    setNewOption(EMPTY_OPTION);
    setFormError('');
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/quiz/questions', {
      method: editingQuestion ? 'PUT' : 'POST',
      body: JSON.stringify({
        ...newQuestion,
        id: editingQuestion?.id,
      })
    });
    setEditingQuestion(null);
    setNewQuestion({ question_text: '', question_text_bn: '', question_type: 'behavior', order_index: 0 });
    fetchData();
  };

  const handleDeleteQuestion = async (id: string) => {
    if (confirm(t.admin.quiz.deleteQuestionConfirm)) {
      await fetch(`/api/admin/quiz/questions?id=${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const startEditingQuestion = (question: any) => {
    setEditingQuestion(question);
    setNewQuestion({
      question_text: question.question_text,
      question_text_bn: question.question_text_bn || '',
      question_type: question.question_type,
      order_index: Number(question.order_index || 0),
    });
  };

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setNewQuestion({ question_text: '', question_text_bn: '', question_type: 'behavior', order_index: 0 });
  };

  const toggleBikeMapping = (bike: any) => {
    const existing = newOption.bike_mappings.find((mapping: BikeMapping) => mapping.bike_id === bike.id);
    if (existing) {
      setNewOption({
        ...newOption,
        bike_mappings: newOption.bike_mappings.filter((mapping: BikeMapping) => mapping.bike_id !== bike.id),
      });
      return;
    }

    setNewOption({
      ...newOption,
      bike_mappings: [
        ...newOption.bike_mappings,
        {
          bike_id: bike.id,
          model_name: bike.model_name,
          weight_percent: 0,
          priority_order: newOption.bike_mappings.length + 1,
          is_active: true,
        },
      ],
    });
  };

  const updateMapping = (bikeId: number, patch: Partial<BikeMapping>) => {
    setNewOption({
      ...newOption,
      bike_mappings: newOption.bike_mappings.map((mapping: BikeMapping) =>
        mapping.bike_id === bikeId ? { ...mapping, ...patch } : mapping
      ),
    });
  };

  const normalizeMappings = (mappings: BikeMapping[]) =>
    mappings.map((mapping, index) => ({
      bike_id: Number(mapping.bike_id),
      weight_percent: Number(mapping.weight_percent || 0),
      priority_order: Number(mapping.priority_order || index + 1),
      is_active: mapping.is_active !== false,
    }));

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      ...newOption,
      id: editingOption?.id,
      question_id: selectedQuestion.id,
      bike_mappings: normalizeMappings(newOption.bike_mappings),
    };

    if (selectedQuestion.question_type === 'behavior') {
      if (!payload.bike_mappings.length) {
        setFormError(t.admin.quiz.selectBikeError);
        return;
      }

      if (totalActiveWeight(newOption.bike_mappings) !== 100) {
        setFormError(t.admin.quiz.weightError);
        return;
      }
    }

    const res = await fetch('/api/admin/quiz/options', {
      method: editingOption ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      setFormError(data.error || t.admin.quiz.saveOptionError);
      return;
    }

    resetOptionForm();
    fetchOptions(selectedQuestion.id);
  };

  const handleDeleteOption = async (id: string) => {
    if (confirm(t.admin.quiz.deleteOptionConfirm)) {
      await fetch(`/api/admin/quiz/options?id=${id}`, { method: 'DELETE' });
      fetchOptions(selectedQuestion.id);
    }
  };

  const startEditingOption = (option: any) => {
    setEditingOption(option);
    setNewOption({
      option_text: option.option_text,
      option_text_bn: option.option_text_bn || '',
      option_desc: option.option_desc,
      option_desc_bn: option.option_desc_bn || '',
      icon_name: option.icon_name,
      metadata: typeof option.metadata === 'string' ? JSON.parse(option.metadata || '{}') : (option.metadata || {}),
      is_active: option.is_active !== false && option.is_active !== 0,
      bike_mappings: (option.bike_mappings || []).map((mapping: any, index: number) => ({
        bike_id: mapping.bike_id,
        model_name: mapping.model_name,
        weight_percent: Number(mapping.weight_percent || 0),
        priority_order: Number(mapping.priority_order || index + 1),
        is_active: mapping.is_active !== false && mapping.is_active !== 0,
      })),
    });
    setFormError('');
  };

  const Icons = {
    Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    Back: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
    Check: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  };

  return (
    <div className="fade-in">
      {!selectedQuestion ? (
        <>
          <div className={styles.header}><h1>{t.admin.quiz.title}</h1></div>
          <div className={styles.card}>
            <h2 style={{ marginBottom: '20px' }}>{editingQuestion ? `${t.common.edit} ${t.admin.quiz.cols.question}` : t.admin.quiz.createQuestion}</h2>
            <form onSubmit={handleAddQuestion} className={styles.formGrid}>
              <input placeholder={t.admin.quiz.questionText} value={newQuestion.question_text} onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })} className={styles.input} required />
              <input placeholder={t.admin.quiz.questionTextBn} value={newQuestion.question_text_bn} onChange={(e) => setNewQuestion({ ...newQuestion, question_text_bn: e.target.value })} className={styles.input} />
              <select value={newQuestion.question_type} onChange={(e) => setNewQuestion({ ...newQuestion, question_type: e.target.value as any })} className={styles.select} required>
                <option value="behavior">{t.admin.quiz.questionTypes.behavior}</option>
                <option value="destination">{t.admin.quiz.questionTypes.destination}</option>
                <option value="aspiration">{t.admin.quiz.questionTypes.aspiration}</option>
              </select>
              <input type="number" placeholder={t.admin.quiz.displayOrder} value={newQuestion.order_index} onChange={(e) => setNewQuestion({ ...newQuestion, order_index: parseInt(e.target.value) || 0 })} className={styles.input} />
              <button type="submit" className={styles.primaryBtn}><Icons.Plus /> {editingQuestion ? t.common.save : t.admin.quiz.addQuestion}</button>
              {editingQuestion && (
                <button type="button" className={styles.secondaryBtn} onClick={resetQuestionForm}>
                  {t.common.cancel}
                </button>
              )}
            </form>
          </div>
          <div className={styles.card}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead><tr><th>{t.admin.quiz.cols.order}</th><th>{t.admin.quiz.cols.question}</th><th>{t.admin.quiz.cols.type}</th><th>{t.admin.quiz.cols.actions}</th></tr></thead>
                <tbody>
                  {quizQuestions.map((q) => (
                    <tr key={q.id}>
                      <td style={{ width: '60px', color: '#007aff', fontWeight: 800 }}>{q.order_index}</td>
                      <td style={{ fontWeight: 500 }}>{q.question_text}<div style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px', marginTop: '4px' }}>{q.question_text_bn || t.common.notAvailable}</div></td>
                      <td><span className={styles.badge} style={{ background: q.question_type === 'behavior' ? 'rgba(0, 122, 255, 0.2)' : q.question_type === 'destination' ? 'rgba(0, 255, 122, 0.1)' : 'rgba(255, 122, 0, 0.1)', color: q.question_type === 'behavior' ? '#007aff' : q.question_type === 'destination' ? '#00ff7a' : '#ff7a00' }}>{q.question_type}</span></td>
                      <td>
                        <button onClick={() => startEditingQuestion(q)} className={styles.editBtn}>{t.common.edit}</button>
                        <button onClick={() => setSelectedQuestion(q)} className={styles.editBtn}>{t.admin.quiz.manageOptions}</button>
                        <button onClick={() => handleDeleteQuestion(q.id)} className={styles.dangerBtn}>{t.common.delete}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <button onClick={() => { setSelectedQuestion(null); setQuizOptions([]); resetOptionForm(); }} className={styles.backBtn}><Icons.Back /> {t.admin.quiz.backToQuestions}</button>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '28px', color: 'white' }}>{selectedQuestion.question_text}</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px', fontWeight: 700, marginTop: '4px' }}>{t.admin.quiz.type}: {selectedQuestion.question_type}</p>
          </div>
          <div className={styles.card}>
            <h3 style={{ marginBottom: '24px' }}>{editingOption ? t.admin.quiz.editOption : t.admin.quiz.createOption}</h3>
            <form onSubmit={handleAddOption} className={styles.formGrid}>
              <input placeholder={t.admin.quiz.optionTitle} value={newOption.option_text} onChange={(e) => setNewOption({ ...newOption, option_text: e.target.value })} className={styles.input} required />
              <input placeholder={t.admin.quiz.optionTitleBn} value={newOption.option_text_bn} onChange={(e) => setNewOption({ ...newOption, option_text_bn: e.target.value })} className={styles.input} />
              <input placeholder={t.admin.quiz.shortDescription} value={newOption.option_desc} onChange={(e) => setNewOption({ ...newOption, option_desc: e.target.value })} className={styles.input} />
              <input placeholder={t.admin.quiz.shortDescriptionBn} value={newOption.option_desc_bn} onChange={(e) => setNewOption({ ...newOption, option_desc_bn: e.target.value })} className={styles.input} />
              <input placeholder={t.admin.quiz.iconName} value={newOption.icon_name} onChange={(e) => setNewOption({ ...newOption, icon_name: e.target.value })} className={`${styles.input} ${styles.span2}`} />
              <label className={styles.span2} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.72)' }}>
                <input
                  type="checkbox"
                  checked={newOption.is_active !== false}
                  onChange={(e) => setNewOption({ ...newOption, is_active: e.target.checked })}
                />
                {t.admin.quiz.optionStatus}
              </label>

              {selectedQuestion.question_type === 'behavior' && (
                <>
                  <div className={styles.span2}>
                    <label className={styles.statLabel} style={{ marginBottom: '12px', display: 'block' }}>{t.admin.quiz.selectBikes}</label>
                    <div className={styles.bikeGrid}>
                      {bikes.map((bike) => (
                        <div
                          key={bike.id}
                          className={`${styles.bikeItem} ${newOption.bike_mappings.some((mapping: BikeMapping) => mapping.bike_id === bike.id) ? styles.selected : ''}`}
                          onClick={() => toggleBikeMapping(bike)}
                        >
                          <div className={styles.checkbox}><Icons.Check /></div>
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>{bike.model_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {newOption.bike_mappings.length > 0 && (
                    <div className={styles.span2}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <label className={styles.statLabel}>{t.admin.quiz.bikePriorityWeight}</label>
                        <span style={{ color: totalActiveWeight(newOption.bike_mappings) === 100 ? '#00ff7a' : '#ffb020', fontSize: '12px', fontWeight: 700 }}>
                          {t.admin.quiz.activeWeightTotal}: {totalActiveWeight(newOption.bike_mappings)}%
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {newOption.bike_mappings
                          .slice()
                          .sort((a: BikeMapping, b: BikeMapping) => a.priority_order - b.priority_order)
                          .map((mapping: BikeMapping) => (
                            <div key={mapping.bike_id} className={styles.bikeMappingRow}>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>{mapping.model_name}</div>
                              <input type="number" min="0" max="100" className={styles.input} value={mapping.weight_percent} onChange={(e) => updateMapping(mapping.bike_id, { weight_percent: parseInt(e.target.value) || 0 })} placeholder={t.admin.quiz.weight} />
                              <input type="number" min="1" className={styles.input} value={mapping.priority_order} onChange={(e) => updateMapping(mapping.bike_id, { priority_order: parseInt(e.target.value) || 1 })} placeholder={t.admin.quiz.priority} />
                              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
                                <input type="checkbox" checked={mapping.is_active !== false} onChange={(e) => updateMapping(mapping.bike_id, { is_active: e.target.checked })} />
                                {t.admin.quiz.active}
                              </label>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedQuestion.question_type === 'destination' && (
                <>
                  <input placeholder={t.admin.quiz.personalitySignal} value={newOption.metadata?.personality || ''} onChange={(e) => setNewOption({ ...newOption, metadata: { ...newOption.metadata, personality: e.target.value } })} className={styles.input} />
                  <input placeholder={t.admin.quiz.sceneDescription} value={newOption.metadata?.scene || ''} onChange={(e) => setNewOption({ ...newOption, metadata: { ...newOption.metadata, scene: e.target.value } })} className={styles.input} />
                </>
              )}

              {selectedQuestion.question_type === 'aspiration' && (
                <input placeholder={t.admin.quiz.targetBikeColor} value={newOption.metadata?.color || ''} onChange={(e) => setNewOption({ ...newOption, metadata: { ...newOption.metadata, color: e.target.value } })} className={`${styles.input} ${styles.span2}`} />
              )}

              {formError && (
                <div className={styles.span2} style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff8080', borderRadius: '10px', padding: '12px 14px', fontSize: '13px' }}>
                  {formError}
                </div>
              )}

              <div className={styles.span2} style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button type="submit" className={styles.primaryBtn}>{editingOption ? t.admin.quiz.updateOption : t.admin.quiz.createOptionButton}</button>
                {editingOption && <button type="button" onClick={resetOptionForm} className={styles.secondaryBtn}>{t.common.cancel}</button>}
              </div>
            </form>
          </div>
          <div className={styles.card}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead><tr><th>{t.admin.quiz.cols.title}</th><th>{t.admin.quiz.cols.status}</th><th>{t.admin.quiz.cols.metadata}</th><th>{t.admin.quiz.cols.actions}</th></tr></thead>
                <tbody>
                  {quizOptions.map((option) => (
                    <tr key={option.id}>
                      <td style={{ fontWeight: 600 }}>{option.option_text}<div style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px', marginTop: '4px' }}>{option.option_text_bn || t.common.notAvailable}</div></td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{
                            background: option.is_active ? 'rgba(0, 255, 122, 0.1)' : 'rgba(255, 77, 77, 0.12)',
                            color: option.is_active ? '#00ff7a' : '#ff8080',
                          }}
                        >
                          {option.is_active ? t.common.enabled : t.common.disabled}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                        {selectedQuestion.question_type === 'behavior'
                          ? (option.bike_mappings || []).map((mapping: any) => `${mapping.model_name} (${mapping.weight_percent}%)`).join(', ') || t.admin.quiz.none
                          : selectedQuestion.question_type === 'destination'
                            ? `${t.admin.quiz.scene}: ${(typeof option.metadata === 'string' ? JSON.parse(option.metadata || '{}') : option.metadata || {}).scene || t.common.notAvailable}`
                            : `${t.admin.quiz.color}: ${(typeof option.metadata === 'string' ? JSON.parse(option.metadata || '{}') : option.metadata || {}).color || t.common.notAvailable}`}
                      </td>
                      <td>
                        <button onClick={() => startEditingOption(option)} className={styles.editBtn}>{t.common.edit}</button>
                        <button onClick={() => handleDeleteOption(option.id)} className={styles.dangerBtn}>{t.common.delete}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
