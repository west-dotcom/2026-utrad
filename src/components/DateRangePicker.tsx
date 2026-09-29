import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  CalendarDays,
} from 'lucide-react';

export type DateRangePreset = '7D' | '30D' | '90D' | 'YTD' | 'ALL' | 'CUSTOM';

export interface DateRangeFilter {
  preset: DateRangePreset;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  label: string;
}

interface DateRangePickerProps {
  currentFilter: DateRangeFilter;
  onChangeFilter: (filter: DateRangeFilter) => void;
  minAvailableDate?: string;
  maxAvailableDate?: string;
  totalAvailableDays?: number;
  filteredDaysCount?: number;
  filteredPnL?: number;
}

export function DateRangePicker({
  currentFilter,
  onChangeFilter,
  minAvailableDate = '2026-01-01',
  maxAvailableDate = '2026-12-31',
  totalAvailableDays = 90,
  filteredDaysCount = 30,
  filteredPnL,
}: DateRangePickerProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(currentFilter.preset === 'CUSTOM');
  const [customStart, setCustomStart] = useState(currentFilter.startDate);
  const [customEnd, setCustomEnd] = useState(currentFilter.endDate);

  // Sync internal state when external preset changes
  useEffect(() => {
    setCustomStart(currentFilter.startDate);
    setCustomEnd(currentFilter.endDate);
    if (currentFilter.preset !== 'CUSTOM') {
      setIsCustomOpen(false);
    }
  }, [currentFilter]);

  // Handle Preset Button Click
  const handleSelectPreset = (preset: DateRangePreset) => {
    if (preset === 'CUSTOM') {
      setIsCustomOpen(true);
      onChangeFilter({
        preset: 'CUSTOM',
        startDate: customStart,
        endDate: customEnd,
        label: `Custom: ${customStart} to ${customEnd}`,
      });
      return;
    }

    setIsCustomOpen(false);

    // Compute start and end dates relative to minAvailableDate (2026-01-01)
    const baseDate = new Date('2026-01-01T00:00:00');
    let startDateStr = '2026-01-01';
    let endDateStr = '2026-01-30';
    let label = 'Last 30 Days';

    if (preset === '7D') {
      const endD = new Date(baseDate);
      endD.setDate(baseDate.getDate() + 6); // 7 days (Jan 1 to Jan 7)
      endDateStr = formatDate(endD);
      label = '7 Days (Jan 1 - Jan 7, 2026)';
    } else if (preset === '30D') {
      const endD = new Date(baseDate);
      endD.setDate(baseDate.getDate() + 29); // 30 days (Jan 1 to Jan 30)
      endDateStr = formatDate(endD);
      label = '30 Days (Jan 1 - Jan 30, 2026)';
    } else if (preset === '90D') {
      const endD = new Date(baseDate);
      endD.setDate(baseDate.getDate() + 89); // 90 days (Jan 1 to Mar 31)
      endDateStr = formatDate(endD);
      label = '90 Days (Jan 1 - Mar 31, 2026)';
    } else if (preset === 'YTD') {
      startDateStr = '2026-01-01';
      endDateStr = '2026-12-31';
      label = 'Year-to-Date 2026';
    } else if (preset === 'ALL') {
      startDateStr = '2026-01-01';
      endDateStr = '2027-12-31';
      label = 'All Recorded Ledger Days';
    }

    onChangeFilter({
      preset,
      startDate: startDateStr,
      endDate: endDateStr,
      label,
    });
  };

  // Handle Custom Date Range Submit
  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;

    // Ensure start is before or equal to end
    let s = customStart;
    let end = customEnd;
    if (s > end) {
      const temp = s;
      s = end;
      end = temp;
      setCustomStart(s);
      setCustomEnd(end);
    }

    onChangeFilter({
      preset: 'CUSTOM',
      startDate: s,
      endDate: end,
      label: `Custom: ${s} to ${end}`,
    });
  };

  const presets: { id: DateRangePreset; label: string; sub: string }[] = [
    { id: '7D', label: '7 Days', sub: '1 Week' },
    { id: '30D', label: '30 Days', sub: '1 Month' },
    { id: '90D', label: '90 Days', sub: '1 Quarter' },
    { id: 'YTD', label: 'YTD', sub: 'Year to Date' },
    { id: 'ALL', label: 'All Time', sub: 'Full History' },
  ];

  return (
    <div
      id="dashboard-date-range-picker"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Active Filter Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Analytical Time Window
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Synchronized across Line Chart, Bar Chart & Heatmap
            </span>
          </div>

          <div className="flex items-center gap-2.5 pt-0.5">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Date Range Filter
            </h3>
            <span className="text-xs font-mono font-semibold text-slate-300 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              {currentFilter.label}
            </span>
          </div>
        </div>

        {/* Preset Button Controls */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono self-start lg:self-auto">
          {presets.map((item) => {
            const isActive = currentFilter.preset === item.id;
            return (
              <button
                key={item.id}
                id={`preset-${item.id.toLowerCase()}-btn`}
                onClick={() => handleSelectPreset(item.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Custom Date Window Toggle */}
          <button
            id="preset-custom-btn"
            onClick={() => setIsCustomOpen(!isCustomOpen)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              currentFilter.preset === 'CUSTOM' || isCustomOpen
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Custom Window</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isCustomOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Expandable Custom Date Range Selector Form */}
      {isCustomOpen && (
        <form
          onSubmit={handleApplyCustom}
          className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 flex flex-wrap items-center gap-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <span className="text-slate-400">Start Date:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <span className="text-slate-400">End Date:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Apply Custom Window
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('30D')}
            className="px-3 py-1 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to 30D</span>
          </button>
        </form>
      )}

      {/* Active Time Window Status Strip */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80 font-mono gap-2">
        <div className="flex items-center gap-2">
          <span>Active Period:</span>
          <span className="text-white font-bold">
            {formatPrettyDate(currentFilter.startDate)} → {formatPrettyDate(currentFilter.endDate)}
          </span>
          <span className="text-slate-500">•</span>
          <span>
            Showing <strong className="text-emerald-400">{filteredDaysCount}</strong> days of data
          </span>
        </div>

        {filteredPnL !== undefined && (
          <div className="flex items-center gap-2">
            <span>Window Realized P&L:</span>
            <span
              className={`font-bold ${
                filteredPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {filteredPnL >= 0 ? '+' : ''}$
              {filteredPnL.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Format date helper: "YYYY-MM-DD"
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Pretty print helper: "May 1, 2025"
function formatPrettyDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, monthIndex, day);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  } catch (err) {
    // fallback
  }
  return dateStr;
}
