import React, { useState } from 'react';
import { 
  Search, Filter, Download, MessageSquare, ExternalLink, 
  Eye, MoreVertical, Smartphone, CheckCircle2, Clock, AlertCircle, 
  Trash2, Copy, Check, UserPlus, RefreshCw, Send, LayoutGrid, 
  Table as TableIcon, UserCheck, ShieldCheck, FileText, ChevronRight
} from 'lucide-react';

export default function EmployeeDashboard({
  employees,
  forms,
  loading,
  onRefresh,
  onViewEmployee,
  onOpenNewEmployee,
  onOpenMobileSim,
  onDeleteEmployee,
  onApproveHire,
  isRealtimeConnected = true
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [copiedToken, setCopiedToken] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'

  // Departments list
  const departments = ['all', ...new Set(employees.map(e => e.department).filter(Boolean))];

  // Filtering
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.idNumber?.includes(searchTerm) ||
      emp.phone?.includes(searchTerm) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  const getBaseOrigin = () => {
    return window.location.origin;
  };

  const handleCopyLink = (token) => {
    const origin = getBaseOrigin();
    const link = `${origin}/onboard/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleSendWhatsApp = (emp) => {
    const origin = getBaseOrigin();
    const link = `${origin}/onboard/${emp.token}`;
    const cleanPhone = emp.phone ? emp.phone.replace(/[^0-9]/g, '').replace(/^0/, '972') : '';
    const text = encodeURIComponent(
      `שלום ${emp.fullName},\nברוך/ה הבא/ה לאודי מרילי פתרונות תעסוקה!\nמצורף קישור אישי מאובטח למילוי טפסי הקליטה שלך (פרטי בנק, טופס 101 והעלאת מסמכים):\n${link}\n\nהמילוי מותאם במיוחד לסמארטפון ולוקח כ-5 דקות.\nבהצלחה,\nיפעת אודי מרילי (077-5177045)`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            עובד/ת פעיל/ה (אושר)
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            הוגש לבדיקת HR
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
            בתהליך מילוי
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            טרם התחיל
          </span>
        );
    }
  };

  // Kanban Columns
  const kanbanColumns = [
    { id: 'not_started', title: 'טרם התחילו', color: 'border-slate-300 bg-slate-50/50' },
    { id: 'in_progress', title: 'בתהליך מילוי', color: 'border-amber-300 bg-amber-50/30' },
    { id: 'completed', title: 'ממתין לבדיקה והחלטה', color: 'border-blue-300 bg-blue-50/30' },
    { id: 'approved', title: 'עובדים שאושרו ונקלטו', color: 'border-emerald-300 bg-emerald-50/30' }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-right">
      
      {/* Table Header & Controls */}
      <div className="p-4 sm:p-6 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900">
                צנרת קליטת מועמדים (Pipeline)
              </h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                {filteredEmployees.length} מתוך {employees.length}
              </span>
              {/* Real-time Indicator */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                מחובר בזמן אמת
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              מעקב חי אחר מילוי טפסים, מסמכים מאומתים, ואישור סופי לקליטת עובד ע"י יפעת
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View switcher: Table vs Kanban */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === 'table' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="תצוגת טבלה מפורטת"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">טבלה</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === 'kanban' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="תצוגת לוח קנבן"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">קנבן</span>
              </button>
            </div>

            <button
              onClick={() => window.open('/api/export/csv', '_blank')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition"
              title="ייצוא קובץ CSV תואם אקסל ומערכות שכר"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">ייצוא לאקסל</span>
            </button>

            <button
              onClick={onRefresh}
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              title="רענן נתונים"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onOpenNewEmployee}
              className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>יצירת קישור קליטה חדש</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Search box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="חיפוש לפי שם מועמד, ת.ז., טלפון או דוא״ל..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-right"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-700 font-medium text-right"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="completed">הושלמו (ממתינים לבדיקה)</option>
              <option value="in_progress">בתהליך מילוי</option>
              <option value="not_started">טרם התחילו</option>
              <option value="approved">מאושרים במלואם</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="sm:col-span-3">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-700 font-medium text-right"
            >
              <option value="all">כל המחלקות</option>
              {departments.filter(d => d !== 'all').map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ================= VIEW 1: TABLE VIEW ================= */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-xs font-semibold">
                <th className="py-3.5 px-4 sm:px-6">פרטי המועמד/ת</th>
                <th className="py-3.5 px-4 hidden md:table-cell">מחלקה ותפקיד</th>
                <th className="py-3.5 px-4">סטטוס</th>
                <th className="py-3.5 px-4">התקדמות טפסים</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">עדכון אחרון</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">פעולות ואישור HR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">לא נמצאו מועמדים התואמים לחיפוש</p>
                      <p className="text-xs text-slate-400">נסה לאפס את הסינונים או ליצור קישור קליטה חדש</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-indigo-50/30 transition group">
                    
                    {/* Name, ID, Contact */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                          {emp.fullName ? emp.fullName.slice(0, 2) : 'ע'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{emp.fullName}</span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>ת.ז: {emp.idNumber}</span>
                            <span>•</span>
                            <span>{emp.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Dept & Role */}
                    <td className="py-4 px-4 hidden md:table-cell">
                      <div className="font-medium text-slate-800 text-xs">{emp.role}</div>
                      <div className="text-[11px] text-slate-500">{emp.department}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      {getStatusBadge(emp.status)}
                    </td>

                    {/* Progress Bar */}
                    <td className="py-4 px-4">
                      <div className="w-32">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-700">{emp.progress}%</span>
                          <span className="text-[11px] text-slate-400">{emp.completedFormsCount || 0}/{emp.formsCount || 5}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              emp.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${emp.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 hidden lg:table-cell text-xs text-slate-500">
                      {emp.submittedAt || 'נשלח קישור'}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* APPROVE & HIRE BUTTON (if ready or pending) */}
                        {emp.status !== 'approved' && emp.progress >= 80 && (
                          <button
                            onClick={() => onApproveHire && onApproveHire(emp.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
                            title="אישור סופי וקליטה כעובד פעיל"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>אשר וקלוט</span>
                          </button>
                        )}

                        {/* View Dossier */}
                        <button
                          onClick={() => onViewEmployee(emp)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                          title="צפה בכל הטפסים, החתימות והמסמכים של המועמד"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">צפה בתיק</span>
                        </button>

                        {/* WhatsApp Quick Share */}
                        <button
                          onClick={() => handleSendWhatsApp(emp)}
                          className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                          title="שלח קישור למילוי בוואטסאפ של המועמד"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {/* Copy Link */}
                        <button
                          onClick={() => handleCopyLink(emp.token)}
                          className={`p-1.5 rounded-lg transition ${
                            copiedToken === emp.token
                              ? 'bg-emerald-500 text-white'
                              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                          }`}
                          title={copiedToken === emp.token ? 'הקישור הועתק!' : 'העתק קישור מאובטח למועמד'}
                        >
                          {copiedToken === emp.token ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {/* Mobile Simulator */}
                        <button
                          onClick={() => onOpenMobileSim(emp)}
                          className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                          title="בדוק איך זה נראה בסמארטפון"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => {
                            if (window.confirm(`האם למחוק את המועמד/ת ${emp.fullName}?`)) {
                              onDeleteEmployee(emp.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="מחק מועמד"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= VIEW 2: KANBAN BOARD VIEW ================= */}
      {viewMode === 'kanban' && (
        <div className="p-4 sm:p-6 bg-slate-50/70 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kanbanColumns.map(col => {
              const colEmployees = filteredEmployees.filter(e => {
                if (col.id === 'completed') return e.status === 'completed';
                if (col.id === 'approved') return e.status === 'approved';
                if (col.id === 'in_progress') return e.status === 'in_progress';
                return e.status === 'not_started';
              });

              return (
                <div key={col.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[450px]">
                  {/* Column Header */}
                  <div className={`p-3.5 border-b border-slate-200 flex items-center justify-between ${col.color}`}>
                    <h3 className="text-xs font-bold text-slate-800">{col.title}</h3>
                    <span className="text-xs font-black bg-white/90 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                      {colEmployees.length}
                    </span>
                  </div>

                  {/* Candidate Cards List */}
                  <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                    {colEmployees.length === 0 ? (
                      <div className="h-32 flex items-center justify-center text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        אין מועמדים בשלב זה
                      </div>
                    ) : (
                      colEmployees.map(emp => (
                        <div
                          key={emp.id}
                          className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm hover:border-indigo-300 hover:shadow-md transition text-right space-y-2.5"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-xs text-slate-900">{emp.fullName}</h4>
                              <p className="text-[11px] text-slate-500">{emp.role}</p>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {emp.progress}%
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${emp.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                              style={{ width: `${emp.progress}%` }}
                            />
                          </div>

                          <div className="text-[10px] text-slate-400 flex items-center justify-between">
                            <span>{emp.phone}</span>
                            <span>{emp.completedFormsCount || 0}/{emp.formsCount || 5} טפסים</span>
                          </div>

                          {/* Card Actions */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                            <button
                              onClick={() => onViewEmployee(emp)}
                              className="flex-1 py-1 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold text-center transition"
                            >
                              צפה בתיק
                            </button>

                            {emp.status !== 'approved' && emp.progress >= 80 && (
                              <button
                                onClick={() => onApproveHire && onApproveHire(emp.id)}
                                className="py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold text-center transition"
                                title="אשר וקלוט כעובד פעיל"
                              >
                                אשר וקלוט
                              </button>
                            )}

                            <button
                              onClick={() => handleCopyLink(emp.token)}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                              title="העתק קישור"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleSendWhatsApp(emp)}
                              className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                              title="שלח וואטסאפ"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
