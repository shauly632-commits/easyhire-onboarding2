import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, CheckCircle, AlertTriangle, Printer, Download, ExternalLink, 
  FileText, ShieldCheck, HeartPulse, UserCheck, Receipt, FileBadge,
  Calendar, Phone, Mail, MapPin, Building, CreditCard, PenTool, Check,
  ThumbsUp, ThumbsDown, Clock, ShieldAlert, Sparkles
} from 'lucide-react';

export default function EmployeeDetailModal({ 
  employee, 
  forms, 
  onClose, 
  onUpdateStatus, 
  onSaveNotes,
  onApproveHire,
  onToggleDocApproval
}) {
  if (!employee) return null;

  const [activeTab, setActiveTab] = useState(forms[0]?.id || 'form-personal-bank');
  const [notes, setNotes] = useState(employee.notes || '');
  const [status, setStatus] = useState(employee.status);
  const [savingNotes, setSavingNotes] = useState(false);
  const [hiring, setHiring] = useState(false);

  const getFormIcon = (iconName) => {
    switch (iconName) {
      case 'UserCheck': return <UserCheck className="w-4 h-4" />;
      case 'ShieldCheck': return <ShieldCheck className="w-4 h-4" />;
      case 'HeartPulse': return <HeartPulse className="w-4 h-4" />;
      case 'FileBadge': return <FileBadge className="w-4 h-4" />;
      case 'Receipt': return <Receipt className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    onUpdateStatus(employee.id, newStatus);
  };

  const handleSaveNotes = () => {
    setSavingNotes(true);
    onSaveNotes(employee.id, notes);
    setTimeout(() => setSavingNotes(false), 1000);
  };

  const handleApproveAndHire = async () => {
    if (!window.confirm(`האם לאשר רשמית את קליטת העובד/ת ${employee.fullName} ולהעבירו לסטטוס עובד פעיל?`)) {
      return;
    }

    try {
      setHiring(true);
      if (onApproveHire) {
        await onApproveHire(employee.id, notes);
      } else {
        handleStatusChange('approved');
      }

      setStatus('approved');
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    } catch (err) {
      alert('שגיאה באישור הקליטה');
    } finally {
      setHiring(false);
    }
  };

  const activeForm = forms.find(f => f.id === activeTab);
  const activeSubmission = employee.submissions ? employee.submissions[activeTab] : null;
  const isApproved = status === 'approved';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-inner">
              {employee.fullName ? employee.fullName.slice(0, 2) : 'ע'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{employee.fullName}</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  status === 'completed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {status === 'approved' ? 'עובד/ת פעיל/ה (אושר)' : status === 'completed' ? 'הוגש לבדיקת HR' : 'בתהליך מילוי'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ת.ז: {employee.idNumber} • {employee.role} ({employee.department}) • נקלט/ה: {employee.hireDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Top CTA: Approve & Hire if not approved yet */}
            {!isApproved && (
              <button
                onClick={handleApproveAndHire}
                disabled={hiring}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{hiring ? 'מאשר קליטה...' : 'אשר וקלוט לעבודה (Approve & Hire)'}</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
              title="הדפס או שמור כ-PDF את כל תיק העובד"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">הדפס / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          
          {/* Sidebar / Forms List */}
          <div className="w-full md:w-72 bg-slate-50 border-b md:border-b-0 md:border-l border-slate-200 p-3 sm:p-4 flex-shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              טפסי קליטה ({employee.completedFormsCount || 0}/{forms.length})
            </h3>
            
            <div className="space-y-1.5">
              {forms.map(form => {
                const isSubmitted = employee.submissions && !!employee.submissions[form.id];
                const isActive = activeTab === form.id;
                return (
                  <button
                    key={form.id}
                    onClick={() => setActiveTab(form.id)}
                    className={`w-full text-right p-3 rounded-xl transition flex items-center justify-between ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className={isActive ? 'text-white' : 'text-indigo-600'}>
                        {getFormIcon(form.icon)}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold text-xs truncate">{form.title}</div>
                        <div className={`text-[10px] truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {form.category}
                        </div>
                      </div>
                    </div>
                    {isSubmitted ? (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <Check className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">
                        טרם מולא
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Status Approval Box */}
            <div className="mt-5 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">סטטוס תיק קליטה</label>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                >
                  <option value="not_started">טרם התחיל</option>
                  <option value="in_progress">בתהליך מילוי</option>
                  <option value="completed">הושלם (ממתין לבדיקת HR)</option>
                  <option value="approved">עובד/ת פעיל/ה (אושר רשמית)</option>
                </select>
              </div>

              {!isApproved ? (
                <button
                  onClick={handleApproveAndHire}
                  disabled={hiring}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-100 transition"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{hiring ? 'מאשר...' : 'קלוט כעובד פעיל (Approve & Hire)'}</span>
                </button>
              ) : (
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>קליטה הושלמה ואושרה כחוק</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">הערות מעקב של יפעת</label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הערות פנימיות למעקב..."
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  className="mt-1.5 w-full py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition"
                >
                  {savingNotes ? 'נשמר...' : 'שמור הערה'}
                </button>
              </div>
            </div>
          </div>

          {/* Form Details Area (printable) */}
          <div className="flex-1 p-4 sm:p-6 bg-white overflow-y-auto" id="print-area">
            {activeForm ? (
              <div>
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    {getFormIcon(activeForm.icon)}
                    <span className="text-xs font-bold uppercase tracking-wider">{activeForm.category}</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">{activeForm.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{activeForm.description}</p>
                </div>

                {!activeSubmission ? (
                  <div className="p-8 text-center bg-amber-50/50 rounded-2xl border border-dashed border-amber-200">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <h4 className="font-bold text-amber-800 text-sm">המועמד/ת עדיין לא מילא/ה טופס זה</h4>
                    <p className="text-xs text-amber-600 mt-1">נשלחה תזכורת אוטומטית לעובד/ת להשלמת המילוי.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Timestamp & Status */}
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800">
                      <span className="font-bold flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                        הטופס נחתם והוגש בהצלחה
                      </span>
                      <span>תאריך הגשה: {activeSubmission.signedAt || 'לפני זמן קצר'}</span>
                    </div>

                    {/* Field Data Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeForm.fields.map(field => {
                        const val = activeSubmission[field.id];

                        if (field.type === 'notice') {
                          return (
                            <div key={field.id} className="sm:col-span-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200/60">
                              <span className="font-bold text-slate-800 block mb-1">{field.label}:</span>
                              <p className="leading-relaxed whitespace-pre-line">{field.content}</p>
                            </div>
                          );
                        }

                        if (field.type === 'signature') {
                          return (
                            <div key={field.id} className="sm:col-span-2 p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100">
                              <span className="text-xs font-bold text-slate-700 block mb-2">{field.label}</span>
                              {val ? (
                                <div className="bg-white p-3 rounded-xl border border-indigo-200 inline-block shadow-sm">
                                  <img src={val} alt="חתימה דיגיטלית" className="max-h-24 object-contain" />
                                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>חתימה אלקטרונית מאומתת</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">לא נחתם</span>
                              )}
                            </div>
                          );
                        }

                        if (field.type === 'file') {
                          const docApproval = employee.documentApprovals?.[field.id];
                          const isDocApproved = docApproval?.isApproved;

                          return (
                            <div key={field.id} className="sm:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-700">{field.label}</span>
                                {isDocApproved && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Check className="w-3 h-3" /> מאושר ע"י משאבי אנוש
                                  </span>
                                )}
                              </div>

                              {val ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-16 h-14 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center flex-shrink-0">
                                      <img src={val} alt={field.label} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                      <a
                                        href={val}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        צפה במסמך בגודל מלא
                                      </a>
                                      <span className="text-[11px] text-slate-400 block mt-0.5">מסמך מצורף ומאומת</span>
                                    </div>
                                  </div>

                                  {/* Doc Approval Toggle */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => onToggleDocApproval && onToggleDocApproval(employee.id, field.id, !isDocApproved)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                                        isDocApproved 
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                      }`}
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>{isDocApproved ? 'מסמך מאושר' : 'אשר מסמך זה'}</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-rose-500 font-medium">לא הועלה קובץ</span>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div key={field.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">{field.label}</span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-800">
                              {typeof val === 'boolean' ? (val ? 'כן (מאושר)' : 'לא') : val || '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

        </div>

      </div>
    </div>
  );
}
