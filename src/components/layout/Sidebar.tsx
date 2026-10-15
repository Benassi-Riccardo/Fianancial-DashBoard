import React from 'react';
import { LayoutDashboard, CalendarDays, Target, PieChart, Receipt, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

import monogramLogo from '@/FinanceFlow-Monogram_logo.jpg';

export type TabId = 'dashboard' | 'annual' | 'sinking' | 'networth' | 'transactions' | 'settings';

interface SidebarProps {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function Sidebar({ currentTab, onTabChange }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'annual', label: 'Visione Annuale', icon: CalendarDays },
    { id: 'sinking', label: 'Sinking Funds', icon: Target },
    { id: 'networth', label: 'Stato Patrimoniale', icon: PieChart },
    { id: 'transactions', label: 'Transazioni', icon: Receipt },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
  ] as const;

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'US';

  return (
    <aside className="w-64 border-r border-blue-100/50 bg-white flex flex-col h-screen sticky top-0">
      <div className="p-5 flex items-center gap-3 border-b border-blue-50/80">
        <img 
          src={monogramLogo} 
          alt="FinanceFlow Logo" 
          className="h-10 w-10 object-contain rounded-xl border border-sky-100 bg-white shadow-xs" 
        />
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent leading-none">
            FinanceFlow
          </h1>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Smart Finances</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer",
                isActive 
                  ? "bg-sky-50 text-sky-600 font-medium" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon size={20} className={cn(isActive ? "text-sky-600" : "text-slate-400")} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center space-x-3 min-w-0">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {initials}
              </div>
            )}
            <div className="flex flex-col text-left min-w-0">
              <span className="text-xs font-semibold text-slate-900 truncate">
                {user?.name || user?.email || 'User'}
              </span>
              <span className="text-[11px] text-slate-500 truncate">
                {user?.email || 'Authenticated'}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Esci dall'account"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer ml-1"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
