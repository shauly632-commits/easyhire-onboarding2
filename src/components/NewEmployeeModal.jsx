import React, { useState } from 'react';
import { X, UserPlus, Send, Copy, Check, MessageSquare } from 'lucide-react';

export default function NewEmployeeModal({ onClose, onSaveEmployee }) {
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'אישה',
    idNumber: '',
    phone: '',
    email: '',
    role: 'מדריכת דיור',
    department: 'מערך דיור - ירושלים',
    hireDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.idNumber.trim()) {
      alert('נא להזין לפחות שם מלא ומספר תעודת זהות');
      return;
    }

    const newEmp = await onSaveEmployee(formData);
    if (newEmp) {
      setCreatedEmployee(newEmp);
    }
  };

  const getShareLink = () => {
    if (!createdEmployee) return '';
    return `${window.location.origin}/onboard/${createdEmployee.token}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!createdEmployee) return;
    const link = getShareLink();
    const cleanPhone = createdEmployee.phone ? createdEmployee.phone.replace(/[^0-9]/g, '').replace(/^0/, '972') : '';
    const text = encodeURIComponent(
      `שלום ${createdEmployee.fullName},\nברוך/ה הבא/ה לאודי מרילי - פתרונות תעסוקה יצירתיים בע"מ!\nמצורף קישור אישי למילוי טפסי הקליטה שלך (פרטי בנק, אישור רפואי, טופס משטרה, הסכם סודיות והסכם עבודה):\n${link}\n\nהמילוי מותאם במיוחד לסמארטפון ולוקח כ-5 דקות.\nבהצלחה,\nיפעת אודי מרילי (077-5177045)`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">קליטת עובד/ת חדש/ה - אודי מרילי</h2>
              <p className="text-xs text-slate-400">הזנת פרטי עובד ויצירת קישור דיגיטלי למילוי טפסים מהנייד</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If employee created, show success & link sharing */}
        {createdEmployee ? (
          <div className="p-6 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">העובד/ת נוסף/ה בהצלחה!</h3>
              <p className="text-xs text-slate-500 mt-1">
                נוצר תיק קליטה דיגיטלי עבור <strong>{createdEmployee.fullName}</strong> ({createdEmployee.gender})
              </p>
              <div className="mt-2 text-xs text-indigo-700 bg-indigo-50 p-2 rounded-lg inline-block font-semibold">
                {createdEmployee.gender === 'גבר' ? 'הוגדרו 8 טפסים (כולל אישור משטרה לעבירות מין)' : 'הוגדרו 7 טפסי קליטה (כולל אישור משטרה לחסרי ישע)'}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-right">
              <label className="text-[11px] font-bold text-slate-500 block mb-1">קישור ישיר לסמארטפון/מחשב של העובד:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getShareLink()}
                  className="flex-1 text-xs bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 select-all font-mono"
                />
                <button
                  onClick={handleCopy}
                  className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'הועתק!' : 'העתק'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleSendWhatsApp}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>שלח קישור ישיר בוואטסאפ</span>
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition"
              >
                סגור וחזור לרשימה
              </button>
            </div>
          </div>
        ) : (
          /* Form for new employee */
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  שם מלא (עברית) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="למשל: יובל ששון"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  מגדר (לקביעת טפסי משטרה כחוק) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                >
                  <option value="אישה">אישה (טופס משטרה חסרי ישע בלבד)</option>
                  <option value="גבר">גבר (חסרי ישע + מניעת עבירות מין)</option>
                </select>
              </div>

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
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">טלפון נייד (לוואטסאפ)</label>
                <input
                  type="tel"
                  placeholder="050-1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">דואר אלקטרוני (לתלוש שכר)</label>
                <input
                  type="email"
                  placeholder="yuval@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">תפקיד מיועד</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  <option value="מדריך/ת דיור">מדריך/ת דיור (35.40 ₪/שעה)</option>
                  <option value="רכז/ת דירה">רכז/ת דירה</option>
                  <option value="עובד/ת סוציאלי/ת">עובד/ת סוציאלי/ת (עו״ס)</option>
                  <option value="אם בית / אב בית">אם בית / אב בית</option>
                  <option value="מלווה תעסוקתי">מלווה תעסוקתי</option>
                  <option value="אחר">אחר</option>
                </select>
              </div>

            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">הערות פנימיות למשאבי אנוש (יפעת)</label>
              <textarea
                rows="2"
                placeholder="הערות לגבי דירה משויכת, משמרות, ציוד וכו'..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                ביטול
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition"
              >
                צור עובד והפק קישור דיגיטלי
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
