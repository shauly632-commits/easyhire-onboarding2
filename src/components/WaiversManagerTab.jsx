import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Clock, MessageSquare, AlertCircle, RefreshCw, Check } from 'lucide-react';

export default function WaiversManagerTab({ waivers, onReviewWaiver, onRefresh, loading }) {
  const [reviewingId, setReviewingId] = useState(null);

  const pendingList = waivers.filter(w => w.status === 'pending');
  const historyList = waivers.filter(w => w.status !== 'pending');

  const handleReview = async (waiverId, status) => {
    try {
      setReviewingId(waiverId);
      await onReviewWaiver(waiverId, status);
    } catch (err) {
      alert('שגיאה בעדכון הבקשה');
    } finally {
      setReviewingId(null);
    }
  };

  const handleWhatsApp = (waiver) => {
    const cleanPhone = waiver.employeePhone ? waiver.employeePhone.replace(/[^0-9]/g, '').replace(/^0/, '972') : '';
    const text = encodeURIComponent(
      `שלום ${waiver.employeeName},\nבנוגע לבקשתך לפטור זמני מצירוף "${waiver.fieldName}":\n`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              בקשות עובדים לפטור זמני ממסמכים (אישור יפעת)
            </h2>
            {pendingList.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                {pendingList.length} ממתינות לאישורך
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            עובדים אינם יכולים להגיש את תיק הקליטה ללא צירוף כלל הקבצים (ת״ז, בנק, משטרה, רפואי), אלא אם אישרת להם פטור זמני כאן.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto transition"
          title="רענן רשימה"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Pending Requests Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
          <span>בקשות הממתינות לאישורך כעת</span>
          <span className="text-xs text-slate-400 font-normal">({pendingList.length})</span>
        </h3>

        {pendingList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-xs">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <span className="font-bold text-slate-700 block">אין בקשות פטור ממתינות!</span>
            <span>כל העובדים צירפו את כלל המסמכים הנדרשים או שכל הבקשות כבר טופלו.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingList.map(w => (
              <div key={w.id} className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-sm space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-base text-slate-900 block">{w.employeeName}</span>
                    <span className="text-xs text-slate-500">טלפון: {w.employeePhone} • נשלח: {w.requestedAt}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-full border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
                    ממתין לאישורך
                  </span>
                </div>

                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 text-xs space-y-1">
                  <div className="font-bold text-amber-900">
                    מסמך מבוקש: <span className="underline">{w.fieldName}</span>
                  </div>
                  <div className="text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-800">נימוק העובד/ת: </span>
                    "{w.reason}"
                  </div>
                </div>

                {/* Review Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleReview(w.id, 'approved')}
                    disabled={reviewingId === w.id}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>אשר פטור זמני לעובד</span>
                  </button>

                  <button
                    onClick={() => handleReview(w.id, 'rejected')}
                    disabled={reviewingId === w.id}
                    className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center gap-1 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>דחה</span>
                  </button>

                  <button
                    onClick={() => handleWhatsApp(w)}
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition"
                    title="שלח וואטסאפ לעובד"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History Section */}
      {historyList.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            היסטוריית בקשות שטופלו ({historyList.length})
          </h3>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-xs">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-4">שם העובד</th>
                  <th className="py-2.5 px-4">מסמך</th>
                  <th className="py-2.5 px-4">נימוק</th>
                  <th className="py-2.5 px-4">סטטוס</th>
                  <th className="py-2.5 px-4">טופל ע״י</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {historyList.map(h => (
                  <tr key={h.id}>
                    <td className="py-2.5 px-4 font-bold">{h.employeeName}</td>
                    <td className="py-2.5 px-4">{h.fieldName}</td>
                    <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">{h.reason}</td>
                    <td className="py-2.5 px-4">
                      {h.status === 'approved' ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          אושר פטור
                        </span>
                      ) : (
                        <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          נדחה
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">{h.reviewedBy} ({h.reviewedAt})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
