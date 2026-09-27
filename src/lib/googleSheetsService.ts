import { Transaction, DailySnapshot, GoogleSheetMeta } from '../types';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Creates a brand new 3-sheet Google Spreadsheet in the user's Google Drive:
 * Sheet 1: Transactions (Raw log with Date, Type, Amount, Asset, Source/Dest, Gas/Fees, Notes/Bot ID, Running Capital, Loan Balance)
 * Sheet 2: Daily Snapshot (Aggregated EOD metrics, Daily Return %, Cumulative PnL, Loan Balance)
 * Sheet 3: Dashboard & Summary (Executive metrics, automated Google Sheets formulas)
 */
export async function createCryptoBotSpreadsheet(
  accessToken: string,
  title: string = 'Crypto Trading Bot Master Ledger (10-Year)',
  transactions: Transaction[] = [],
  snapshots: DailySnapshot[] = []
): Promise<GoogleSheetMeta> {
  const createPayload = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Transactions',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: 'Daily Snapshot',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: 'Dashboard',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    ],
  };

  const createRes = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create Google Spreadsheet: ${createRes.statusText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // Format headers and data
  await syncAllToSpreadsheet(accessToken, spreadsheetId, transactions, snapshots);

  return {
    spreadsheetId,
    title,
    url: spreadsheetUrl,
    lastSyncedAt: new Date().toISOString(),
    sheetNames: ['Transactions', 'Daily Snapshot', 'Dashboard'],
  };
}

/**
 * Synchronizes all 3 sheets (Transactions, Daily Snapshot, Dashboard) into the Google Sheet
 */
export async function syncAllToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  transactions: Transaction[],
  snapshots: DailySnapshot[]
): Promise<void> {
  // 1. Transactions Sheet values (Cleaned: No Gas / Fees)
  const txHeader = [
    'Date',
    'Type',
    'Amount',
    'Asset',
    'Running Capital',
    'Loan Balance',
  ];

  const txRows = transactions.map((tx) => [
    tx.date,
    tx.type,
    tx.amount,
    tx.asset,
    tx.runningCapital ?? '',
    tx.loanBalance ?? '',
  ]);

  // 2. Daily Snapshot Sheet values
  const snapHeader = [
    'Date',
    'Start Capital',
    'Net Inflows',
    'Realized PnL',
    'Profit Target Met',
    'Interest',
    'End Capital',
    'Daily Return %',
    'Cumulative PnL',
    'Loan Balance',
  ];

  const snapRows = snapshots.map((s) => [
    s.date,
    s.startCapital,
    s.netInflows,
    s.realizedPnL,
    s.targetMet ? 'MET' : s.targetMet === false ? 'MISSED' : '—',
    s.interest,
    s.endCapital,
    `${s.dailyReturnPct}%`,
    s.cumulativePnL,
    s.loanBalance,
  ]);

  // 3. Dashboard Summary Values with formulas
  const dashboardRows = [
    ['Executive Metric', 'Value', 'Formula / Logic'],
    ['Current Active Capital', '=IF(COUNTA(Transactions!E2:E)>0, INDEX(Transactions!E2:E, COUNTA(Transactions!E2:E)), 0)', 'Latest running capital from Transactions'],
    ['Outstanding Loan Balance', '=IF(COUNTA(Transactions!F2:F)>0, INDEX(Transactions!F2:F, COUNTA(Transactions!F2:F)), 0)', 'Latest running debt balance'],
    ['Cumulative Realized PnL', '=SUMIF(Transactions!B:B, "Trade PnL", Transactions!C:C)', 'Sum of all realized daily trade PnL'],
    ['Total Net Inflows (Deposits - Withdrawals)', '=SUMIF(Transactions!B:B, "Deposit", Transactions!C:C) - SUMIF(Transactions!B:B, "Withdrawal", Transactions!C:C)', 'External money invested vs extracted'],
    ['Average Daily Return', '=IF(COUNTA(\'Daily Snapshot\'!H2:H)>0, AVERAGE(\'Daily Snapshot\'!H2:H), 0)', 'Arithmetic mean of daily return percentage'],
    ['Total Recorded Trades & Events', '=COUNTA(Transactions!A2:A)', 'Total logged items in audit trail'],
    ['Last Synced', new Date().toLocaleString(), 'Timestamp of synchronization with app'],
  ];

  const batchUpdatePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: 'Transactions!A1:F',
        values: [txHeader, ...txRows],
      },
      {
        range: "'Daily Snapshot'!A1:J",
        values: [snapHeader, ...snapRows],
      },
      {
        range: 'Dashboard!A1:C',
        values: dashboardRows,
      },
    ],
  };

  const updateRes = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchUpdatePayload),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to update spreadsheet: ${updateRes.statusText}`);
  }
}

/**
 * Pulls transaction records from an existing Google Sheet
 */
export async function fetchTransactionsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Transaction[]> {
  const range = 'Transactions!A2:G5000';
  const res = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch transactions from sheet: ${res.statusText}`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows
    .filter((row) => row && row[0]) // must have date
    .map((row, index) => {
      const date = String(row[0] || '').trim();
      const type = (row[1] || 'Trade PnL') as Transaction['type'];
      const amount = parseFloat(String(row[2] || '0').replace(/[^0-9.-]/g, '')) || 0;
      const asset = String(row[3] || 'USDT').trim();

      return {
        id: `sheet-tx-${index}-${Date.now()}`,
        date,
        type,
        amount,
        asset,
        gasFee: 0,
      };
    });
}

/**
 * Fetches basic spreadsheet metadata
 */
export async function getSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; url: string; sheets: string[] }> {
  const res = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}?fields=properties.title,spreadsheetUrl,sheets.properties.title`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to retrieve spreadsheet info: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    title: data.properties?.title || 'Trading Bot Ledger',
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    sheets: (data.sheets || []).map((s: any) => s.properties?.title),
  };
}

export const fetchTransactionsFromSpreadsheet = fetchTransactionsFromSheet;
