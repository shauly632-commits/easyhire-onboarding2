import React, { useState } from 'react';
import { X, Plus, Trash2, Check, FileText, MoveUp, MoveDown, Layers, Eye } from 'lucide-react';

export default function FormBuilderModal({ onClose, onSaveForm }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('משאבי אנוש');
  const [estimatedMinutes, setEstimatedMinutes] = useState(3);
  const [required, setRequired] = useState(true);
  const [fields, setFields] = useState([
    { id: 'field_1', label: 'שם מלא או הצהרה', type: 'text', required: true, placeholder: '' },
    { id: 'field_2', label: 'העלאת מסמך / אסמכתה', type: 'file', required: true, hint: 'צילום מהנייד או קובץ PDF' },
    { id: 'field_3', label: 'חתימת העובד', type: 'signature', required: true }
  ]);

  const addField = (type = 'text') => {
    const newField = {
      id: `field_${Date.now()}`,
      label: type === 'signature' ? 'חתימה דיגיטלית' : type === 'file' ? 'העלאת קובץ' : 'שדה חדש',
      type,
      required: true,
      placeholder: '',
      options: type === 'select' ? ['אפשרות 1', 'אפשרות 2'] : undefined
    };
    setFields([...fields, newField]);
  };

  const updateField = (index, updates) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('נא להזין כותרת לטופס');
      return;
    }
    if (fields.length === 0) {
      alert('נא להוסיף לפחות שדה אחד לטופס');
      return;
    }

    onSaveForm({
      title,
      description,
      category,
      estimatedMinutes: Number(estimatedMinutes) || 3,
      required,
      icon: 'FileText',
      fields
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">מחולל טפסים חדשים</h2>
              <p className="text-xs text-slate-400">הוספת טופס מותאם אישית (משטרה, הצהרות, נהלים, אישורים וכו')</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* General info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                כותרת הטופס <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="למשל: אישור בטיחות בעבודה / טופס משמעת"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">קטגוריה</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
              >
                <option value="משאבי אנוש">משאבי אנוש</option>
                <option value="בטחון ורישוי">בטחון ורישוי</option>
                <option value="בריאות ובטיחות">בריאות ובטיחות</option>
                <option value="משפטי וסודיות">משפטי וסודיות</option>
                <option value="שכר וכספים">שכר וכספים</option>
                <option value="לוגיסטיקה ורכב">לוגיסטיקה ורכב</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-xs font-bold text-slate-700 block mb-1">תיאור והנחיות לעובד</label>
              <textarea
                rows="2"
                placeholder="הסבר קצר לעובד מה מטרת הטופס ומה נדרש ממנו למלא או לצרף..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Fields Section */}
          <div>
            <div className="flex items-center justify-between mb-3 border-t border-slate-200 pt-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">שדות הטופס</h3>
                <p className="text-xs text-slate-500">הגדר אילו שדות, קבצים או חתימות העובד יתבקש למלא</p>
              </div>

              {/* Add Field Dropdown/Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => addField('text')}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                >
                  + טקסט
                </button>
                <button
                  type="button"
                  onClick={() => addField('file')}
                  className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg"
                >
                  + קובץ / צילום
                </button>
                <button
                  type="button"
                  onClick={() => addField('checkbox')}
                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg"
                >
                  + הצהרה
                </button>
                <button
                  type="button"
                  onClick={() => addField('signature')}
                  className="px-2.5 py-1 text-xs font-semibold bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg"
                >
                  + חתימה
                </button>
              </div>
            </div>

            {/* Fields List */}
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div key={field.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                    {idx + 1}
                  </span>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">כותרת השדה</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">סוג שדה</label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(idx, { type: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="text">טקסט קצר</option>
                        <option value="textarea">טקסט ארוך</option>
                        <option value="date">תאריך</option>
                        <option value="file">העלאת קובץ / צילום מסמך</option>
                        <option value="checkbox">תיבת סימון / הצהרה</option>
                        <option value="signature">חתימה דיגיטלית</option>
                        <option value="select">בחירה מרובה (Select)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3 flex items-center gap-2 pt-5">
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(idx, { required: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span>שדה חובה</span>
                      </label>
                      
                      <button
                        type="button"
                        onClick={() => removeField(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition mr-auto"
                        title="הסר שדה"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
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
              שמור טופס והוסף לכל העובדים
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
