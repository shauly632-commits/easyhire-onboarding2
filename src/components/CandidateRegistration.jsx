import React, { useState } from 'react';
import { UserPlus, ArrowRight, ShieldCheck, CheckCircle2, FileText, Camera, Phone, Lock, Sparkles } from 'lucide-react';

export default function CandidateRegistration({ onRegistered }) {
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'אישה',
    idNumber: '',
    phone: '',
    email: '',
    role: 'מדריך/ת דיור',
    assignedApartment: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.idNumber.trim() || !formData.phone.trim()) {
      setError('חובה למלא שם מלא, מספר תעודת זהות ומספר טלפון נייד');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'שגיאה בהרשמה לקליטה');
      }

      // Success -> transition to onboarding portal
      if (onRegistered) {
        onRegistered(json.token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 via-slate-50 to-indigo-50/30 py-6 sm:py-12 px-3 sm:px-6 font-sans">
      <div className="max-w-xl mx-auto">
        
        {/* Header Hero Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-lg mb-6 text-right relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-500" />
          
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 flex-shrink-0">
              <span className="font-black text-xl tracking-tighter">אודי</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                קליטת עובד/ת חדש/ה
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                אודי מרילי פתרונות תעסוקה יצירתיים בע״מ • צמיחה אישית. דרך. תעסוקה
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100/80">
            👋 <strong>שלום וברוך/ה הבא/ה לאודי מרילי!</strong><br />
            יצרנו עבורך תהליך קליטה מהיר ומאובטח המותאם במיוחד לסמארטפון.<br />
            מלא/י את פרטייך הראשוניים ותועבר/י מיד למילוי טפסי הקליטה והחתימה הדיגיטלית.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-semibold">
            <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200/60">
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>צילום ת״ז ואישורים בנייד</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200/60">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>חתימה דיגיטלית מאובטחת</span>
            </div>
          </div>
        </div>

        {/* Registration Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl">
          
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <span>הזנת פרטים מזהים לתחילת קליטה</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">הפרטים ישמשו לפתיחת תיק העובד שלך במערכת משאבי אנוש</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                שם מלא בעברית <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="למשל: רחל שפירא"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full text-sm p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  מספר תעודת זהות (9 ספרות) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="012345678"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  className="w-full text-sm p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  מגדר (לקביעת טפסי משטרה כחוק) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full text-sm p-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                >
                  <option value="אישה">אישה (אישור משטרה חסרי ישע)</option>
                  <option value="גבר">גבר (חסרי ישע + מניעת עבירות מין)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  טלפון נייד <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="050-1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full text-sm p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">דואר אלקטרוני (לתלוש שכר)</label>
                <input
                  type="email"
                  placeholder="rachel@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-sm p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">תפקיד מיועד</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full text-sm p-3 rounded-2xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                >
                  <option value="מדריך/ת דיור">מדריך/ת דיור (35.40 ₪/שעה)</option>
                  <option value="רכז/ת דירה">רכז/ת דירה</option>
                  <option value="עובד/ת סוציאלי/ת">עובד/ת סוציאלי/ת (עו״ס)</option>
                  <option value="אם בית / אב בית">אם בית / אב בית</option>
                  <option value="מלווה תעסוקתי">מלווה תעסוקתי</option>
                  <option value="אחר">אחר</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">שם הדירה / מערך (אם ידוע)</label>
                <input
                  type="text"
                  placeholder="למשל: בית הכרם, קטמון..."
                  value={formData.assignedApartment}
                  onChange={(e) => setFormData({ ...formData, assignedApartment: e.target.value })}
                  className="w-full text-sm p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-extrabold text-base rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <span>יוצר תיק קליטה...</span>
                ) : (
                  <>
                    <span>המשך למילוי טפסי הקליטה</span>
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2.5">
                🔒 מנהלת קליטה: יפעת אודי מרילי • 077-5177045
              </p>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
}
