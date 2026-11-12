import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, Clock, ChevronLeft, ChevronRight, Upload, 
  Camera, FileText, ShieldCheck, HeartPulse, UserCheck, Receipt, 
  FileBadge, Check, AlertCircle, ArrowRight, Lock, Sparkles, Send,
  ShieldAlert, HelpCircle, X
} from 'lucide-react';
import SignaturePad from './SignaturePad';

export default function OnboardingPortal({ token, onCompleteSubmission }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [formData, setFormData] = useState({});
  const [uploadingField, setUploadingField] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isCompletedAll, setIsCompletedAll] = useState(false);

  // Waiver request modal state
  const [waiverModalField, setWaiverModalField] = useState(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [submittingWaiver, setSubmittingWaiver] = useState(false);

  // Fetch Onboarding Data for this employee
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/onboarding/${token}`);
      if (!res.ok) {
        throw new Error('קישור לא תקין או שהעובד לא נמצא במערכת');
      }
      const json = await res.json();
      setData(json);

      // Check if all completed
      const total = json.forms.length;
      const completed = Object.keys(json.employee.submissions || {}).length;
      if (completed >= total && total > 0) {
        setIsCompletedAll(true);
      } else {
        // Find first incomplete form
        const nextForm = json.forms.find(f => !json.employee.submissions?.[f.id]);
        if (nextForm && !selectedFormId) {
          setSelectedFormId(nextForm.id);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // Load existing submission or pre-populate with employee details
  useEffect(() => {
    if (data && selectedFormId) {
      const existing = data.employee.submissions?.[selectedFormId];
      if (existing) {
        setFormData(existing);
      } else {
        // Pre-fill common known fields from employee profile
        const activeForm = data.forms.find(f => f.id === selectedFormId);
        const initial = {};
        if (activeForm) {
          activeForm.fields.forEach(field => {
            if (field.id === 'fullName') initial.fullName = data.employee.fullName || '';
            if (field.id === 'gender') initial.gender = data.employee.gender || 'אישה';
            if (field.id === 'idNumber') initial.idNumber = data.employee.idNumber || '';
            if (field.id === 'phone') initial.phone = data.employee.phone || '';
            if (field.id === 'email') initial.email = data.employee.email || '';
            if (field.id === 'assignedApartment' && data.employee.assignedApartment) {
              initial.assignedApartment = data.employee.assignedApartment;
            }
            if (field.defaultValue) initial[field.id] = field.defaultValue;
          });
        }
        setFormData(initial);
      }
    }
  }, [selectedFormId, data]);

  // Handle file upload
  const handleFileUpload = async (fieldId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingField(fieldId);
      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body
      });
      const json = await res.json();
      if (res.ok && json.url) {
        setFormData(prev => ({
          ...prev,
          [fieldId]: json.url
        }));
      } else {
        alert('שגיאה בהעלאת הקובץ');
      }
    } catch (err) {
      alert('שגיאה בתקשורת עם השרת');
    } finally {
      setUploadingField(null);
    }
  };

  // Submit Waiver Request to Yifat
  const handleRequestWaiver = async (e) => {
    e.preventDefault();
    if (!waiverModalField || !waiverReason.trim()) {
      alert('נא לציין את סיבת הבקשה');
      return;
    }

    try {
      setSubmittingWaiver(true);
      const res = await fetch(`/api/onboarding/${token}/request-waiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: selectedFormId,
          fieldId: waiverModalField.id,
          fieldName: waiverModalField.label,
          reason: waiverReason
        })
      });

      const json = await res.json();
      if (res.ok && json.waiver) {
        // Update local waivers list
        setData(prev => ({
          ...prev,
          waivers: [
            json.waiver,
            ...(prev.waivers || []).filter(w => w.fieldId !== waiverModalField.id)
          ]
        }));
        alert('בקשת הפטור נשלחה בהצלחה ליפעת אודי מרילי לבדיקה ואישור!');
        setWaiverModalField(null);
        setWaiverReason('');
      } else {
        alert('שגיאה בשליחת הבקשה');
      }
    } catch (err) {
      alert('שגיאה בתקשורת עם השרת');
    } finally {
      setSubmittingWaiver(false);
    }
  };

  // Submit Current Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!selectedFormId || !data) return;

    const currentForm = data.forms.find(f => f.id === selectedFormId);
    
    // Strict Verification: ALL required files must be attached OR approved by Yifat!
    for (const f of currentForm.fields) {
      if (f.required) {
        if (f.type === 'file') {
          const hasFile = !!formData[f.id];
          const waiver = (data.waivers || []).find(w => w.fieldId === f.id);
          const isApprovedWaiver = waiver && waiver.status === 'approved';

          if (!hasFile && !isApprovedWaiver) {
            if (waiver && waiver.status === 'pending') {
              alert(`חובה לצרף את הקובץ: "${f.label}". בקשת הפטור שלך נשלחה ליפעת וממתינה לאישורה. לאחר אישורה תוכל/י להגיש.`);
            } else {
              alert(`חובה לצרף את הקובץ: "${f.label}". על מנת להתקדם ללא הקובץ, יש להגיש "בקשה לאישור יפעת" ולקבל את אישורה.`);
            }
            return;
          }
        } else if (f.type !== 'notice' && !formData[f.id]) {
          alert(`נא למלא את השדה: "${f.label}"`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/onboarding/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: selectedFormId,
          formData
        })
      });

      if (!res.ok) throw new Error('שגיאה בשמירת הטופס');
      
      const result = await res.json();
      
      // Update local state
      const updatedSubmissions = {
        ...data.employee.submissions,
        [selectedFormId]: formData
      };

      setData({
        ...data,
        employee: {
          ...data.employee,
          submissions: updatedSubmissions,
          progress: result.progress,
          status: result.status
        }
      });

      // Check if all finished
      const total = data.forms.length;
      const completed = Object.keys(updatedSubmissions).length;

      if (completed >= total) {
        setIsCompletedAll(true);
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        // Move to next incomplete form
        const nextIncomplete = data.forms.find(f => !updatedSubmissions[f.id]);
        if (nextIncomplete) {
          setSelectedFormId(nextIncomplete.id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }

      if (onCompleteSubmission) {
        onCompleteSubmission();
      }

    } catch (err) {
      alert(err.message || 'שגיאה בשמירה');
    } finally {
      setSubmitting(false);
    }
  };

  const getFormIcon = (iconName) => {
    switch (iconName) {
      case 'UserCheck': return <UserCheck className="w-5 h-5" />;
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5" />;
      case 'HeartPulse': return <HeartPulse className="w-5 h-5" />;
      case 'FileBadge': return <FileBadge className="w-5 h-5" />;
      case 'Receipt': return <Receipt className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white animate-bounce shadow-lg shadow-indigo-200">
          <UserCheck className="w-6 h-6" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-600">טוען את תיק הקליטה שלך...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-rose-200 shadow-xl max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">קישור לא תקין</h2>
          <p className="text-xs text-slate-500 mb-6">{error || 'לא הצלחנו לאתר את פרטי הקליטה. פנה למשאבי אנוש.'}</p>
        </div>
      </div>
    );
  }

  const { employee, forms, company, waivers = [] } = data;
  const completedCount = Object.keys(employee.submissions || {}).length;
  const totalCount = forms.length;
  const currentForm = forms.find(f => f.id === selectedFormId);
  const currentFormIndex = forms.findIndex(f => f.id === selectedFormId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/90 via-slate-50 to-slate-100 py-4 sm:py-8 px-3 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto">
        
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm mb-5 text-right relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-500" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm shadow-inner border border-indigo-100 flex-shrink-0">
                אודי
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900">
                    שלום {employee.fullName}! 👋
                  </h1>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                    {employee.role || 'מדריך/ת דיור'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  אודי מרילי פתרונות תעסוקה • מנהלת קליטה: {company?.hrManagerName || 'יפעת אודי מרילי'}
                </p>
              </div>
            </div>

            <div className="text-left flex-shrink-0">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200">
                {employee.progress}% הושלם
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
              <span>הושלמו {completedCount} מתוך {totalCount} טפסים כחוק</span>
              <span className="text-emerald-700 font-semibold">מילוי מאובטח מהטלפון הנייד</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-600 to-emerald-500 h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Success Screen if all forms completed */}
        {isCompletedAll ? (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-100 shadow-xl text-center space-y-5 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900">כל הטפסים נחתמו והוגשו בהצלחה! 🎉</h2>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                תודה רבה <strong>{employee.fullName}</strong>, קיבלנו את כל המסמכים, האישורים הרפואיים, טופס המשטרה והסכם הסודיות.
              </p>
            </div>

            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-right max-w-md mx-auto text-xs text-emerald-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <Check className="w-4 h-4" />
                <span>התיק הועבר לבדיקת {company?.hrManagerName || 'יפעת אודי מרילי במשאבי אנוש'}</span>
              </div>
              <p className="text-emerald-700">
                נשלח אליך אישור סופי ברגע שהתיק ייסגר ויועבר להנהלת חשבונות.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsCompletedAll(false)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                צפייה בטפסים שמילאת
              </button>
            </div>
          </div>
        ) : (
          /* Form Filling Mode */
          <div className="space-y-4">
            
            {/* Step Selector Horizontal Pills (Mobile scrollable) */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {forms.map((f, idx) => {
                const isDone = !!employee.submissions?.[f.id];
                const isCurrent = f.id === selectedFormId;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFormId(f.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                      isCurrent
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                    )}
                    <span>{f.title.split(' ')[1] || f.title.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Current Active Form Box */}
            {currentForm && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden animate-in fade-in">
                
                {/* Form Header */}
                <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between text-xs text-indigo-600 font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      {getFormIcon(currentForm.icon)}
                      <span>{currentForm.category}</span>
                    </span>
                    <span>שלב {currentFormIndex + 1} מתוך {forms.length}</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">{currentForm.title}</h2>
                  <p className="text-xs text-slate-500 mt-1">{currentForm.description}</p>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmitForm} className="p-5 sm:p-7 space-y-5 text-right">
                  
                  {currentForm.fields.map(field => {
                    
                    // Notice/Terms box
                    if (field.type === 'notice') {
                      return (
                        <div key={field.id} className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                          <span className="font-bold text-slate-900 block mb-1 text-sm">{field.label}</span>
                          <p>{field.content}</p>
                        </div>
                      );
                    }

                    // Checkbox / Declaration
                    if (field.type === 'checkbox') {
                      return (
                        <label
                          key={field.id}
                          className="flex items-start gap-3 p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 cursor-pointer transition select-none"
                        >
                          <input
                            type="checkbox"
                            required={field.required}
                            checked={!!formData[field.id]}
                            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.checked })}
                            className="mt-1 w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          <div className="text-xs font-semibold text-slate-800 leading-relaxed">
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </div>
                        </label>
                      );
                    }

                    // Digital Signature Pad
                    if (field.type === 'signature') {
                      return (
                        <div key={field.id} className="pt-2">
                          <SignaturePad
                            label={field.label}
                            value={formData[field.id]}
                            onChange={(val) => setFormData({ ...formData, [field.id]: val })}
                          />
                        </div>
                      );
                    }

                    // File upload / Photo + Waiver Request Flow
                    if (field.type === 'file') {
                      const fileUploaded = formData[field.id];
                      const isUploading = uploadingField === field.id;
                      const fieldWaiver = waivers.find(w => w.fieldId === field.id);
                      const isWaiverApproved = fieldWaiver && fieldWaiver.status === 'approved';
                      const isWaiverPending = fieldWaiver && fieldWaiver.status === 'pending';
                      const isWaiverRejected = fieldWaiver && fieldWaiver.status === 'rejected';

                      return (
                        <div key={field.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 block">
                              {field.label} {field.required && <span className="text-rose-500">* (חובה)</span>}
                            </label>

                            {/* Waiver Status Badges */}
                            {isWaiverApproved && (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                אושר פטור זמני ע״י יפעת
                              </span>
                            )}
                            {isWaiverPending && (
                              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                                בקשת פטור נשלחה ליפעת ובבדיקה
                              </span>
                            )}
                            {isWaiverRejected && (
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                הבקשה נדחתה - חובה לצרף
                              </span>
                            )}
                          </div>

                          <div className={`p-4 rounded-2xl border-2 border-dashed transition flex flex-col items-center justify-center gap-2 ${
                            fileUploaded 
                              ? 'border-emerald-300 bg-emerald-50/40' 
                              : isWaiverApproved
                              ? 'border-emerald-200 bg-emerald-50/20'
                              : 'border-slate-300 bg-slate-50 hover:bg-slate-100/50 hover:border-indigo-400'
                          }`}>
                            {fileUploaded ? (
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-white border border-emerald-200 overflow-hidden flex items-center justify-center shadow-sm">
                                    <img src={fileUploaded} alt="Preview" className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      קובץ הועלה בהצלחה
                                    </span>
                                    <a
                                      href={fileUploaded}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] text-indigo-600 hover:underline block"
                                    >
                                      צפה בקובץ
                                    </a>
                                  </div>
                                </div>

                                <label className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer shadow-sm">
                                  החלף
                                  <input
                                    type="file"
                                    accept={field.accept || "image/*,application/pdf"}
                                    onChange={(e) => handleFileUpload(field.id, e)}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            ) : (
                              <>
                                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                  {isUploading ? (
                                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Camera className="w-6 h-6" />
                                  )}
                                </div>
                                <div className="text-center">
                                  <span className="text-xs font-bold text-slate-800 block">
                                    {isUploading ? 'מעלה קובץ...' : 'לחץ לצילום במצלמה או להעלאת קובץ'}
                                  </span>
                                  {field.hint && (
                                    <span className="text-[11px] text-slate-400 block mt-0.5">{field.hint}</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-1">
                                  <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition">
                                    בחר קובץ / צלם בנייד
                                    <input
                                      type="file"
                                      accept={field.accept || "image/*,application/pdf"}
                                      capture="environment"
                                      onChange={(e) => handleFileUpload(field.id, e)}
                                      className="hidden"
                                      disabled={isUploading}
                                    />
                                  </label>

                                  {/* Request Waiver Button */}
                                  {field.required && !isWaiverApproved && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setWaiverModalField(field);
                                        setWaiverReason(fieldWaiver?.reason || '');
                                      }}
                                      className="px-3 py-2 bg-slate-200/80 hover:bg-amber-100 text-slate-700 hover:text-amber-800 text-xs font-bold rounded-xl transition flex items-center gap-1"
                                      title="שלח בקשה ליפעת לאישור הגשה ללא קובץ זה"
                                    >
                                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                      <span>אין ברשותך? בקש אישור מיפעת</span>
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Select / Dropdown
                    if (field.type === 'select') {
                      return (
                        <div key={field.id}>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </label>
                          <select
                            required={field.required}
                            value={formData[field.id] || ''}
                            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                            className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
                          >
                            <option value="">-- בחר מתוך הרשימה --</option>
                            {field.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    // Textarea
                    if (field.type === 'textarea') {
                      return (
                        <div key={field.id}>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </label>
                          <textarea
                            rows="3"
                            required={field.required}
                            placeholder={field.placeholder || ''}
                            value={formData[field.id] || ''}
                            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                            className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                          />
                        </div>
                      );
                    }

                    // Default: Input text / date / tel / email
                    return (
                      <div key={field.id}>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type={field.type || 'text'}
                          required={field.required}
                          placeholder={field.placeholder || ''}
                          value={formData[field.id] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                          className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    );

                  })}

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-slate-200">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm sm:text-base rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
                    >
                      {submitting ? (
                        <span>שומר חתימה ומסמכים...</span>
                      ) : (
                        <>
                          <span>שמור וחתום על הטופס</span>
                          <ArrowRight className="w-5 h-5 rotate-180" />
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-slate-400 mt-2">
                      🔒 המידע נשמר באופן מאובטח ומוגן בהתאם לתקנות הגנת הפרטיות
                    </p>
                  </div>

                </form>

              </div>
            )}

          </div>
        )}

      </div>

      {/* Modal: Request Waiver / Exception from Yifat */}
      {waiverModalField && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-amber-600 font-extrabold text-base">
                <ShieldAlert className="w-5 h-5" />
                <span>בקשת אישור מיפעת (פטור זמני)</span>
              </div>
              <button
                onClick={() => setWaiverModalField(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              חובה על פי חוק לצרף את המסמך: <strong>"{waiverModalField.label}"</strong>.<br />
              במידה ואין ברשותך את המסמך כרגע (למשל: תור עתידי לרופא או אישור משטרה בהנפקה), ציין/י את הסיבה ומועד ההשלמה המשוער. הבקשה תועבר ישירות לבדיקת יפעת אודי מרילי.
            </p>

            <form onSubmit={handleRequestWaiver} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  סיבת הבקשה ומועד צפוי להשלמת המסמך <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="למשל: הזמנתי תור לרופא המשפחה ליום שלישי הקרוב, אישור המשטרה בתהליך הפקה ויגיע בעוד יומיים..."
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWaiverModalField(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={submittingWaiver}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submittingWaiver ? 'שולח בקשה...' : 'שלח בקשה לאישור יפעת'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
