import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { ThemePreference, useTheme } from '../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  variant?: 'segmented' | 'dropdown' | 'mobile';
}

export function ThemeToggle({ className = '', variant = 'segmented' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const options: { id: ThemePreference; label: string; icon: typeof Sun; title: string }[] = [
    {
      id: 'light',
      label: 'Light',
      icon: Sun,
      title: 'Light Mode',
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: Moon,
      title: 'Dark Mode',
    },
    {
      id: 'system',
      label: 'System',
      icon: Monitor,
      title: `System Preference (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`,
    },
  ];

  if (variant === 'mobile') {
    return (
      <div className={`p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 font-mono">
          <span>Theme Preference</span>
          <span className="text-[10px] text-emerald-400 capitalize">Active: {theme}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800/80">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
                title={opt.title}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Segmented control (default for desktop header)
  return (
    <div
      role="group"
      aria-label="Theme selection"
      className={`inline-flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xs backdrop-blur-xs text-xs font-mono ${className}`}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isSelected
                ? 'bg-slate-800 text-emerald-400 font-bold shadow-xs border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title={opt.title}
            aria-pressed={isSelected}
            aria-label={opt.title}
          >
            <Icon
              className={`w-3.5 h-3.5 ${
                isSelected ? 'text-emerald-400' : 'text-slate-400'
              } transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`}
            />
            <span className="hidden lg:inline text-[11px]">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
