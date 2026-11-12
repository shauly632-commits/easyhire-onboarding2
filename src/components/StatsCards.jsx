import React from 'react';
import { Users, CheckCircle2, Clock, AlertCircle, UserCheck } from 'lucide-react';

export default function StatsCards({ stats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 text-right">
      
      {/* 1. Total Candidates */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-slate-500">סה״כ מועמדים בצנרת</span>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.total}</span>
          <span className="text-xs text-slate-400 font-medium">מועמדים פעילים</span>
        </div>
        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, ((stats.total || 0) / (stats.capacityTarget || 180)) * 100)}%` }}
          />
        </div>
      </div>

      {/* 2. Pending Review (Completed by candidate, waiting for Yifat's review) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group hover:shadow-md transition bg-gradient-to-br from-white to-blue-50/30">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-blue-800">ממתינים לבדיקה ואישור</span>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-blue-700">
            {stats.completed - stats.approved > 0 ? stats.completed - stats.approved : 0}
          </span>
          <span className="text-xs text-blue-600 font-medium">הגישו 100% מהטפסים</span>
        </div>
        <p className="mt-3 text-[11px] text-blue-600 font-medium flex items-center gap-1">
          <span>דורשים אישור קליטה ע"י יפעת</span>
        </p>
      </div>

      {/* 3. In Progress */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-100 shadow-sm relative overflow-hidden group hover:shadow-md transition bg-gradient-to-br from-white to-amber-50/20">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-amber-800">בתהליך מילוי</span>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-700">{stats.inProgress}</span>
          <span className="text-xs text-amber-600 font-medium">בשלבי מילוי והעלאה</span>
        </div>
        <p className="mt-3 text-[11px] text-amber-600 font-medium flex items-center gap-1">
          <span>קישור נפתח ומולאו פרטים</span>
        </p>
      </div>

      {/* 4. Approved & Hired */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group hover:shadow-md transition bg-gradient-to-br from-white to-emerald-50/30">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-emerald-800">נקלטו ואושרו לעבודה</span>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{stats.approved}</span>
          <span className="text-xs text-emerald-600 font-medium">עובדים פעילים</span>
        </div>
        <p className="mt-3 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
          <span>תיק שלם, מאושר וחתום</span>
        </p>
      </div>

    </div>
  );
}
