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
 * Generates the full 2-year Farmland schedule from 5/1/2025 through 5/4/2027
 * exactly as documented in the user's 26-page spreadsheet.
 */
export function generateFarmlandSchedule(): FarmlandRow[] {
  const rows: FarmlandRow[] = [];
  const startDate = new Date(2025, 4, 1); // May 1, 2025 (month is 0-indexed)
  const endDate = new Date(2027, 4, 4); // May 4, 2027 (734 days)

  let currentDate = new Date(startDate);
  let index = 0;

  while (currentDate <= endDate) {
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    const year = currentDate.getFullYear();
    const formattedDay = `${month}/${day}/${year}`;

    // Row 1 (5/1/2025): Has initial trade loss -$2545 and UGas -$1175
    if (index === 0) {
      rows.push({
        id: `farm-${index}`,
        day: formattedDay,
        amount: 5000.0,
        tradeLoss: -2545.0,
        ugasFee: -1175.0,
        dailyReturn: -3720.0,
        total: 5000.0,
        ratePct: 15.0,
        notes: 'Initial day allocation; Trade PnL -$2,545 + UGas -$1,175',
      });
    } else {
      // Subsequent daily rows carry the $1,280.00 total remaining capital and 15% rate
      rows.push({
        id: `farm-${index}`,
        day: formattedDay,
        amount: 5000.0,
        tradeLoss: 0,
        ugasFee: 0,
        dailyReturn: 0,
        total: 1280.0,
        ratePct: 15.0,
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
    index++;
  }

  return rows;
}
