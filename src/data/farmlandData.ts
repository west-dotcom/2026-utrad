export interface FarmlandRow {
  id: string;
  day: string; // e.g. "5/1/2025"
  amount: number; // e.g. 5000
  tradeLoss: number; // e.g. -2545 (or 0 for subsequent projected rows)
  ugasFee: number; // e.g. -1175 (or 0 for subsequent projected rows)
  dailyReturn: number; // e.g. -3720
  total: number; // e.g. 1280 (or 5000 on day 1 before deduction)
  ratePct: number; // e.g. 15.00
  notes?: string;
}

export interface FarmlandSummary {
  moneyLostTrade: number; // e.g. -2545
  moneyUsedUGas: number; // e.g. -1175
  totalDailyReturn: number; // e.g. -3720
  totalWithdrawals: number;
  baseAmount: number; // 5000
  remainingCapital: number; // 1280
  shortfallDeficit: number; // 48720
  targetCapital: number; // 50000
}

/**
 * Generates the Farmland schedule set up to 2026/01/01.
 * Row 1: 2026/01/01
 * Subsequent rows: date in cell left empty (""), ready for entry.
 */
export function generateFarmlandSchedule(): FarmlandRow[] {
  const rows: FarmlandRow[] = [];

  for (let index = 0; index < 734; index++) {
    // Row 1 (2026/01/01): Has initial trade loss -$2545 and UGas -$1175
    if (index === 0) {
      rows.push({
        id: `farm-${index}`,
        day: '2026/01/01',
        amount: 5000.0,
        tradeLoss: -2545.0,
        ugasFee: -1175.0,
        dailyReturn: -3720.0,
        total: 5000.0,
        ratePct: 15.0,
        notes: 'Initial day allocation; Trade PnL -$2,545 + UGas -$1,175',
      });
    } else {
      // Subsequent daily rows: date in cell left empty
      rows.push({
        id: `farm-${index}`,
        day: '',
        amount: 5000.0,
        tradeLoss: 0,
        ugasFee: 0,
        dailyReturn: 0,
        total: 1280.0,
        ratePct: 15.0,
      });
    }
  }

  return rows;
}
