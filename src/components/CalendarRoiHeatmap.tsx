import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Info,
  Flame,
  Award,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { DailyLogRow } from '../data/accountsData';

interface CalendarRoiHeatmapProps {
  dailyLog: DailyLogRow[];
  accountName: string;
  isAggregate?: boolean;
  dateRangeLabel?: string;
}

interface ParsedDayData {
  originalDay: string;
  year: number;
  month: number; // 1-12
  date: number; // 1-31
  dateKey: string; // YYYY-MM-DD
  dailyReturn: number;
  dailyReturnPct: number;
  endingCapital: number;
  startingCapital: number;
  notes?: string;
}

export function CalendarRoiHeatmap({
  dailyLog,
  accountName,
  isAggregate = false,
  dateRangeLabel,
}: CalendarRoiHeatmapProps) {
  // Parse all dailyLog rows into indexed map by "YYYY-MM-DD"
  const { dateMap, availableMonths, defaultYear, defaultMonth } = useMemo(() => {
    const map = new Map<string, ParsedDayData>();
    const monthsSet = new Set<string>();

    let firstActiveYear = 2025;
    let firstActiveMonth = 5;

    for (const row of dailyLog) {
      if (!row.day) continue;
      let y = 2025;
      let m = 5;
      let d = 1;

      if (row.day.includes('/')) {
        const parts = row.day.split('/');
        m = parseInt(parts[0], 10) || 1;
        d = parseInt(parts[1], 10) || 1;
        y = parseInt(parts[2], 10) || 2025;
      } else if (row.day.includes('-')) {
        const parts = row.day.split('-');
        y = parseInt(parts[0], 10) || 2025;
        m = parseInt(parts[1], 10) || 1;
        d = parseInt(parts[2], 10) || 1;
      }

      const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const parsedItem: ParsedDayData = {
        originalDay: row.day,
        year: y,
        month: m,
        date: d,
        dateKey,
        dailyReturn: Number(row.dailyReturn) || 0,
        dailyReturnPct: Number(row.dailyReturnPct) || 0,
        endingCapital: Number(row.endingCapital) || 0,
        startingCapital: Number(row.startingCapital) || 0,
        notes: row.notes,
      };

      map.set(dateKey, parsedItem);
      monthsSet.add(`${y}-${String(m).padStart(2, '0')}`);

      // Track the first month with non-zero trading activity
      if (row.dailyReturn !== 0 && monthsSet.size === 1) {
        firstActiveYear = y;
        firstActiveMonth = m;
      }
    }

    const sortedMonths = Array.from(monthsSet).sort();

    return {
      dateMap: map,
      availableMonths: sortedMonths,
      defaultYear: firstActiveYear,
      defaultMonth: firstActiveMonth,
    };
  }, [dailyLog]);

  // Current selected month view (default to active May 2025)
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth); // 1-12
  const [selectedDayDetail, setSelectedDayDetail] = useState<ParsedDayData | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'matrix'>('calendar');

  // Sync selected year/month when active filtered window shifts
  React.useEffect(() => {
    setSelectedYear(defaultYear);
    setSelectedMonth(defaultMonth);
  }, [defaultYear, defaultMonth]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((prev) => prev - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Days of current month data for the calendar grid
  const { calendarCells, monthStats } = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    // 0 = Sunday, 1 = Monday, etc. Let's make Monday index 0
    const firstDayIndex = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    // Monday as start of week: 0 for Mon, 6 for Sun
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const cells: {
      dayNumber: number | null;
      dateKey: string | null;
      data: ParsedDayData | null;
    }[] = [];

    // Leading empty cells
    for (let i = 0; i < startOffset; i++) {
      cells.push({ dayNumber: null, dateKey: null, data: null });
    }

    let activeTradingDays = 0;
    let greenDays = 0;
    let redDays = 0;
    let totalDollarPnL = 0;
    let bestRoi = -Infinity;
    let worstRoi = Infinity;
    let roiSum = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = dateMap.get(dateKey) || null;

      if (dayData && dayData.dailyReturn !== 0) {
        activeTradingDays++;
        totalDollarPnL += dayData.dailyReturn;
        roiSum += dayData.dailyReturnPct;

        if (dayData.dailyReturnPct > 0) greenDays++;
        if (dayData.dailyReturnPct < 0) redDays++;

        if (dayData.dailyReturnPct > bestRoi) bestRoi = dayData.dailyReturnPct;
        if (dayData.dailyReturnPct < worstRoi) worstRoi = dayData.dailyReturnPct;
      }

      cells.push({
        dayNumber: d,
        dateKey,
        data: dayData,
      });
    }

    const avgRoi = activeTradingDays > 0 ? roiSum / activeTradingDays : 0;

    return {
      calendarCells: cells,
      monthStats: {
        activeTradingDays,
        greenDays,
        redDays,
        totalDollarPnL,
        bestRoi: bestRoi === -Infinity ? 0 : bestRoi,
        worstRoi: worstRoi === Infinity ? 0 : worstRoi,
        avgRoi,
      },
    };
  }, [selectedYear, selectedMonth, dateMap]);

  // Color helper function based on daily ROI percentage
  const getRoiColorClasses = (roiPct: number | undefined, isUntraded: boolean) => {
    if (isUntraded || roiPct === undefined || roiPct === 0) {
      return {
        bg: 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700',
        badge: 'text-slate-500 bg-slate-800/40',
        dot: 'bg-slate-600',
      };
    }

    // High performance (Green spectrum)
    if (roiPct >= 20) {
      return {
        bg: 'bg-emerald-600 border-emerald-400 text-white font-bold shadow-md shadow-emerald-600/30 hover:bg-emerald-500',
        badge: 'text-emerald-100 bg-emerald-700/60 font-mono',
        dot: 'bg-emerald-300',
      };
    }
    if (roiPct >= 10) {
      return {
        bg: 'bg-emerald-700 border-emerald-500 text-emerald-50 font-semibold shadow-xs shadow-emerald-700/20 hover:bg-emerald-600',
        badge: 'text-emerald-100 bg-emerald-800/60 font-mono',
        dot: 'bg-emerald-400',
      };
    }
    if (roiPct >= 5) {
      return {
        bg: 'bg-emerald-800/90 border-emerald-600 text-emerald-100 hover:bg-emerald-700',
        badge: 'text-emerald-200 bg-emerald-900/60 font-mono',
        dot: 'bg-emerald-500',
      };
    }
    if (roiPct > 0) {
      return {
        bg: 'bg-emerald-950/80 border-emerald-700/60 text-emerald-200 hover:bg-emerald-900/80',
        badge: 'text-emerald-300 bg-emerald-900/40 font-mono',
        dot: 'bg-emerald-600',
      };
    }

    // Low performance / Drawdown (Red spectrum)
    if (roiPct <= -20) {
      return {
        bg: 'bg-rose-600 border-rose-400 text-white font-bold shadow-md shadow-rose-600/30 hover:bg-rose-500',
        badge: 'text-rose-100 bg-rose-700/60 font-mono',
        dot: 'bg-rose-300',
      };
    }
    if (roiPct <= -10) {
      return {
        bg: 'bg-rose-700 border-rose-500 text-rose-50 font-semibold shadow-xs shadow-rose-700/20 hover:bg-rose-600',
        badge: 'text-rose-100 bg-rose-800/60 font-mono',
        dot: 'bg-rose-400',
      };
    }
    if (roiPct <= -5) {
      return {
        bg: 'bg-rose-800/90 border-rose-600 text-rose-100 hover:bg-rose-700',
        badge: 'text-rose-200 bg-rose-900/60 font-mono',
        dot: 'bg-rose-500',
      };
    }
    return {
      bg: 'bg-rose-950/80 border-rose-700/60 text-rose-200 hover:bg-rose-900/80',
      badge: 'text-rose-300 bg-rose-900/40 font-mono',
      dot: 'bg-rose-600',
    };
  };

  return (
    <div
      id="calendar-roi-heatmap"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5"
    >
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Calendar Performance Heatmap
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {isAggregate ? '∑ All Accounts Combined' : `Account: ${accountName}`}
              {dateRangeLabel && <span className="text-emerald-400 font-semibold ml-1.5">• Window: {dateRangeLabel}</span>}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-1">
            <CalendarIcon className="w-5 h-5 text-emerald-400" />
            <span>
              Daily ROI % Calendar Heatmap
              {dateRangeLabel && <span className="text-sm font-normal text-slate-400 ml-2">({dateRangeLabel})</span>}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Visual calendar highlighting high-performance gains in green and drawdown days in red with daily return percentages.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-xs font-bold text-white font-mono min-w-[130px] text-center">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </span>

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick jump to active trading month */}
          <button
            onClick={() => {
              setSelectedYear(2025);
              setSelectedMonth(5);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors cursor-pointer"
          >
            Launch Month (May '25)
          </button>
        </div>
      </div>

      {/* Month Performance Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Month Total PnL */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Month Net P&L</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div
            className={`text-lg font-bold font-mono ${
              monthStats.totalDollarPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {monthStats.totalDollarPnL >= 0 ? '+' : ''}$
            {monthStats.totalDollarPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            {monthStats.activeTradingDays} active trading days
          </span>
        </div>

        {/* Win/Loss Day Ratio */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Green / Red Days</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono flex items-center gap-1.5">
            <span className="text-emerald-400">{monthStats.greenDays}W</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400">{monthStats.redDays}L</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block">
            Win Rate:{' '}
            <strong className="text-emerald-400">
              {monthStats.activeTradingDays > 0
                ? ((monthStats.greenDays / monthStats.activeTradingDays) * 100).toFixed(1)
                : 0}
              %
            </strong>
          </span>
        </div>

        {/* Best Day ROI */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Peak Day ROI</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            +{monthStats.bestRoi.toFixed(2)}%
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">Highest yield session</span>
        </div>

        {/* Max Drawdown Day */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Worst Drawdown</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div
            className={`text-lg font-bold font-mono ${
              monthStats.worstRoi < 0 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {monthStats.worstRoi < 0 ? '' : '+'}
            {monthStats.worstRoi.toFixed(2)}%
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            {monthStats.worstRoi < 0 ? 'One-off initial dip' : 'No negative sessions'}
          </span>
        </div>

        {/* Average Daily ROI */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Avg Daily ROI %</span>
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div
            className={`text-lg font-bold font-mono ${
              monthStats.avgRoi >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {monthStats.avgRoi >= 0 ? '+' : ''}
            {monthStats.avgRoi.toFixed(2)}%
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">Across active sessions</span>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 overflow-x-auto">
        <div className="min-w-[650px]">
          {/* Days of Week Header (Mon -> Sun) */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span className="text-amber-400/80">Sat</span>
            <span className="text-amber-400/80">Sun</span>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell, index) => {
              if (cell.dayNumber === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="h-24 rounded-xl border border-dashed border-slate-800/40 bg-slate-950/20"
                  />
                );
              }

              const hasTrade = cell.data && cell.data.dailyReturn !== 0;
              const roiPct = cell.data?.dailyReturnPct;
              const dollarReturn = cell.data?.dailyReturn || 0;
              const colors = getRoiColorClasses(roiPct, !hasTrade);
              const isSelected = selectedDayDetail?.dateKey === cell.dateKey;

              return (
                <div
                  key={cell.dateKey || `day-${cell.dayNumber}`}
                  onClick={() => cell.data && setSelectedDayDetail(cell.data)}
                  className={`relative h-24 p-2.5 rounded-xl border flex flex-col justify-between transition-all duration-150 cursor-pointer ${
                    colors.bg
                  } ${
                    isSelected ? 'ring-2 ring-emerald-400 scale-[1.02] shadow-xl z-10' : ''
                  }`}
                >
                  {/* Top Bar: Date number + Status dot */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono">{cell.dayNumber}</span>
                    {hasTrade && (
                      <span className={`w-2 h-2 rounded-full ${colors.dot} ring-2 ring-slate-900`} />
                    )}
                  </div>

                  {/* Middle / Center: Daily ROI Percentage */}
                  <div className="text-center my-auto">
                    {hasTrade ? (
                      <div className="space-y-0.5">
                        <div className="text-xs sm:text-sm font-extrabold tracking-tight font-mono">
                          {roiPct && roiPct >= 0 ? '+' : ''}
                          {roiPct?.toFixed(1)}%
                        </div>
                        <div className="text-[10px] opacity-90 font-mono">
                          {dollarReturn >= 0 ? '+' : ''}${Math.abs(dollarReturn).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono">0.0%</span>
                    )}
                  </div>

                  {/* Bottom indicator */}
                  <div className="text-[9px] text-right opacity-70 font-mono truncate">
                    {cell.data?.endingCapital
                      ? `$${Math.round(cell.data.endingCapital / 1000)}k cap`
                      : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Detailed Breakdown Inspector */}
      {selectedDayDetail && (
        <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Detailed Inspection: {selectedDayDetail.originalDay} ({selectedDayDetail.dateKey})
              </h4>
            </div>
            <button
              onClick={() => setSelectedDayDetail(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Daily ROI %</span>
              <span
                className={`text-base font-bold ${
                  selectedDayDetail.dailyReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {selectedDayDetail.dailyReturnPct >= 0 ? '+' : ''}
                {selectedDayDetail.dailyReturnPct.toFixed(2)}%
              </span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Daily Profit/Loss ($)</span>
              <span
                className={`text-base font-bold ${
                  selectedDayDetail.dailyReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {selectedDayDetail.dailyReturn >= 0 ? '+' : ''}$
                {selectedDayDetail.dailyReturn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Starting Capital</span>
              <span className="text-base font-bold text-white">
                ${selectedDayDetail.startingCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Ending Capital</span>
              <span className="text-base font-bold text-emerald-400">
                ${selectedDayDetail.endingCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {selectedDayDetail.notes && (
            <div className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 font-mono">
              <span className="text-amber-400 font-semibold">Ledger Note:</span>{' '}
              {selectedDayDetail.notes}
            </div>
          )}
        </div>
      )}

      {/* Heatmap Color Scale Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800 gap-3 font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-500 font-semibold">ROI Heat Scale:</span>

          {/* Red Loss spectrum */}
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-rose-600 inline-block border border-rose-400" />
            <span className="text-[10px] text-rose-400">&lt; -20%</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-rose-700 inline-block border border-rose-500" />
            <span className="text-[10px] text-rose-300">-10% to -20%</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-rose-900 inline-block border border-rose-700" />
            <span className="text-[10px] text-rose-300">-1% to -10%</span>
          </div>

          {/* Zero */}
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-slate-900 inline-block border border-slate-800" />
            <span className="text-[10px] text-slate-500">0%</span>
          </div>

          {/* Green Gain spectrum */}
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-emerald-950 inline-block border border-emerald-700" />
            <span className="text-[10px] text-emerald-300">+1% to +5%</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-emerald-800 inline-block border border-emerald-600" />
            <span className="text-[10px] text-emerald-200">+5% to +10%</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-emerald-700 inline-block border border-emerald-500" />
            <span className="text-[10px] text-emerald-100">+10% to +20%</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block border border-emerald-400 shadow-xs shadow-emerald-500/50" />
            <span className="text-[10px] text-emerald-300 font-bold">&gt; +20% High Gain</span>
          </div>
        </div>

        <span className="text-slate-500">
          Click any calendar day to inspect detailed session metrics
        </span>
      </div>
    </div>
  );
}
