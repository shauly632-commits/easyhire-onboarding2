import React, { useState } from 'react';
import { Users, FileText, Smartphone, UserCheck, PlusCircle, ShieldAlert, Link, Check, ExternalLink } from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenNewEmployee, 
  onOpenFormBuilder, 
  stats, 
  pendingWaiversCount = 0,
  isRealtimeConnected = true
}) {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyApplyLink = () => {
    const origin = window.location.origin;
    const applyLink = `${origin}/apply`;
    navigator.clipboard.writeText(applyLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Company info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 flex-shrink-0">
              <span className="font-extrabold text-sm tracking-tighter">Easy</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">EasyHire</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200 hidden sm:inline">
                  דשבורד HR (יפעת)
                </span>
                {isRealtimeConnected && (
                  <span className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>חי (SSE)</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                אודי מרילי פתרונות תעסוקה • תיק ניכויים: 941707242
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'dashboard'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Users className="w-4 h-4" />
              צנרת מועמדים ({stats?.total || 0})
            </button>

            {/* Waivers & File Exceptions Tab */}
            <button
              onClick={() => setActiveTab('waivers')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'waivers'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>אישורי פטור</span>
              {pendingWaiversCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                  {pendingWaiversCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('forms')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'forms'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              סל טפסים ({stats?.formsCount || 8})
            </button>

            <button
              onClick={() => setActiveTab('employee-portal')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'employee-portal'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              פורטל מועמד (Wizard)
            </button>

            <button
              onClick={() => setActiveTab('mobile-sim')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'mobile-sim'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>סימולטור נייד</span>
            </button>
          </nav>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            
            {/* Permanent Candidate Link Button */}
            <button
              onClick={handleCopyApplyLink}
              className={`flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition ${
                copiedLink 
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              }`}
              title="קישור מובנה וקבוע שיפעת שולחת לכל מועמד חדש להרשמה ומילוי מהטלפון"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
              <span>{copiedLink ? 'הקישור הועתק!' : 'קישור למועמדים (/apply)'}</span>
            </button>

            <button
              onClick={onOpenNewEmployee}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition hover:shadow active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">קליטת עובד חדש</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden border-t border-slate-100 py-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
            }`}
          >
            לוח עובדים
          </button>
          <button
            onClick={() => setActiveTab('waivers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'waivers' ? 'bg-amber-50 text-amber-700' : 'text-slate-600'
            }`}
          >
            <span>אישורי פטור</span>
            {pendingWaiversCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingWaiversCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('forms')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activeTab === 'forms' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
            }`}
          >
            סל טפסים
          </button>
          <button
            onClick={() => setActiveTab('employee-portal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activeTab === 'employee-portal' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
            }`}
          >
            תצוגת עובד
          </button>
          <button
            onClick={() => setActiveTab('mobile-sim')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activeTab === 'mobile-sim' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
            }`}
          >
            סימולטור נייד
          </button>
        </div>
      </div>
    </header>
  );
}
