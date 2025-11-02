const DEFAULT_HORIZON_URL = 'https://horizon-testnet.stellar.org';

const HORIZON_URL =
  process.env.HORIZON_URL ||
  process.env.NEXT_PUBLIC_HORIZON_URL ||
  DEFAULT_HORIZON_URL;

interface HorizonRecord<T> {
  _embedded: {
    records: T[];
  };
}

export interface HorizonPaymentRecord {
  id: string;
  type: string;
  amount: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  from?: string;
  to?: string;
  created_at: string;
  transaction_hash: string;
  source_account?: string;
  to_muxed?: string;
  from_muxed?: string;
}

export interface HorizonTransactionRecord {
  id: string;
  hash: string;
  created_at: string;
  source_account: string;
  memo?: string;
  memo_bytes?: string;
  fee_charged: string;
  successful: boolean;
}

function buildUrl(path: string, searchParams?: Record<string, string | number | undefined>) {
  const url = new URL(path, `${HORIZON_URL.replace(/\/$/, '')}/`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function horizonFetch<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = buildUrl(path, params);
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    next: { revalidate: 10 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Horizon request failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function getPayments(account: string, limit = 50): Promise<HorizonPaymentRecord[]> {
  const data = await horizonFetch<HorizonRecord<HorizonPaymentRecord>>(
    `/accounts/${account}/payments`,
    { order: 'desc', limit }
  );
  return data._embedded.records;
}

export async function getTransactions(account: string, limit = 50): Promise<HorizonTransactionRecord[]> {
  const data = await horizonFetch<HorizonRecord<HorizonTransactionRecord>>(
    `/accounts/${account}/transactions`,
    { order: 'desc', limit }
  );
  return data._embedded.records;
}

export function normalizeAsset(record: HorizonPaymentRecord): { asset: string; issuer?: string } {
  if (record.asset_type === 'native') {
    return { asset: 'XLM' };
  }
  return {
    asset: record.asset_code || 'UNKNOWN',
    issuer: record.asset_issuer,
  };
}

export function normalizePayment(record: HorizonPaymentRecord) {
  const { asset, issuer } = normalizeAsset(record);
  return {
    id: record.id,
    type: record.type,
    amount: parseFloat(record.amount),
    asset,
    issuer,
    from: record.from || record.source_account,
    to: record.to,
    createdAt: record.created_at,
    hash: record.transaction_hash,
  };
}
