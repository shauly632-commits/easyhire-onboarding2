import React from 'react';
import { 
  FileText, Plus, ShieldCheck, HeartPulse, UserCheck, Receipt, 
  FileBadge, Trash2, Edit3, CheckCircle2, Clock, Check
} from 'lucide-react';

export default function FormsListTab({ forms, onOpenFormBuilder, onDeleteForm }) {
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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>סל טפסי קליטה מובנים ומותאמים ({forms.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            טפסים אלו מוצגים באופן אוטומטי לכל 180 העובדים למילוי מהסמארטפון או מהמחשב
          </p>
        </div>

        <button
          onClick={onOpenFormBuilder}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>הוסף טופס חדש</span>
        </button>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {forms.map((form, idx) => (
          <div
            key={form.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  {getFormIcon(form.icon)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                    {form.category}
                  </span>
                  {form.required && (
                    <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-100">
                      חובה
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-indigo-600 transition">
                {form.title}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                {form.description}
              </p>

              {/* Fields preview pill badges */}
              <div className="border-t border-slate-100 pt-3">
                <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                  שדות כלולים ({form.fields.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {form.fields.slice(0, 4).map(f => (
                    <span key={f.id} className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[150px]">
                      {f.label}
                    </span>
                  ))}
                  {form.fields.length > 4 && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                      +{form.fields.length - 4} עוד
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom info & actions */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                כ-{form.estimatedMinutes || 3} דקות מילוי
              </span>

              {form.id.startsWith('form-') && !['form-personal-bank', 'form-nda', 'form-health-medical'].includes(form.id) && (
                <button
                  onClick={() => {
                    if (window.confirm(`האם למחוק את הטופס "${form.title}"?`)) {
                      onDeleteForm(form.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                  title="מחק טופס זה"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
