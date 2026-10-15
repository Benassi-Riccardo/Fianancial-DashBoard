import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { cn } from '@/lib/utils';
import fullLogo from '@/FinanceFlow-Full-Logo.jpg';
import monogramLogo from '@/FinanceFlow-Monogram_logo.jpg';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Target, 
  PieChart, 
  Receipt, 
  Settings, 
  LogOut 
} from 'lucide-react';

interface HeaderProps {
  isScrolled: boolean;
}

const TAB_TITLES: Record<string, { label: string; icon: React.ElementType }> = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  annual: { label: 'Visione Annuale', icon: CalendarDays },
  sinking: { label: 'Sinking Funds', icon: Target },
  networth: { label: 'Stato Patrimoniale', icon: PieChart },
  transactions: { label: 'Transazioni', icon: Receipt },
  settings: { label: 'Impostazioni', icon: Settings },
};

export function Header({ isScrolled }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const { activeTab } = useFinanceStore();

  const currentTabInfo = TAB_TITLES[activeTab] || TAB_TITLES.dashboard;
  const CurrentIcon = currentTabInfo.icon;

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'FF';

  return (
    <header 
      className={cn(
        "sticky top-0 z-30 w-full transition-all duration-300 ease-in-out border-b",
        isScrolled 
          ? "h-16 bg-white/95 backdrop-blur-md border-blue-200/80 shadow-xs px-6 sm:px-8" 
          : "h-20 bg-white/80 backdrop-blur-xs border-blue-100/60 px-6 sm:px-8"
      )}
    >
      <div className="h-full max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Dynamic Transitioning Logo */}
        <div className="flex items-center min-w-0">
          <div className="relative flex items-center h-12">
            {/* Full Logo - Displayed at top of page */}
            <div 
              className={cn(
                "transition-all duration-300 ease-in-out origin-left flex items-center",
                isScrolled 
                  ? "opacity-0 -translate-x-3 scale-95 pointer-events-none absolute" 
                  : "opacity-100 translate-x-0 scale-100 relative"
              )}
            >
              <img 
                src={fullLogo} 
                alt="FinanceFlow Full Logo" 
                className="h-10 sm:h-12 w-auto max-w-[200px] sm:max-w-[240px] object-contain rounded-lg" 
              />
            </div>

            {/* Monogram Logo - Transitions in when user scrolls down */}
            <div 
              className={cn(
                "transition-all duration-300 ease-in-out origin-left flex items-center gap-3",
                isScrolled 
                  ? "opacity-100 translate-x-0 scale-100 relative" 
                  : "opacity-0 -translate-x-3 scale-95 pointer-events-none absolute"
              )}
            >
              <img 
                src={monogramLogo} 
                alt="FinanceFlow Monogram Logo" 
                className="h-9 w-9 object-contain rounded-xl border border-sky-100 bg-white shadow-xs" 
              />
              <div className="hidden sm:block">
                <span className="font-bold text-slate-800 text-sm tracking-tight block leading-none">FinanceFlow</span>
                <span className="text-[10px] text-slate-400 font-medium">Dashboard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Current View Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700">
          <CurrentIcon size={14} className="text-sky-600" />
          <span>{currentTabInfo.label}</span>
        </div>

        {/* Right: User Profile & Quick Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2.5 pl-2 py-1 pr-1.5 rounded-full bg-slate-50/80 border border-slate-100">
              {user.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name || 'User'} 
                  className="w-7 h-7 rounded-full object-cover border border-sky-200" 
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {initials}
                </div>
              )}
              <span className="text-xs font-medium text-slate-700 hidden lg:inline max-w-[120px] truncate">
                {user.name || user.email}
              </span>
              <button
                onClick={logout}
                title="Disconnetti"
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
