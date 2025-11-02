import { NextResponse } from 'next/server';
import { scoreTransaction, TxInput } from '@/lib/risk';

interface RiskScoreRequest {
  account?: string;
  account_balance?: number | string; // Current account balance for balance ratio calculation
  tx?: {
    to?: string;
    amount?: number | string;
    asset?: string;
    ts?: string;
  };
}

function parseRequest(body: RiskScoreRequest): { account: string; tx: TxInput } {
  if (!body.account || typeof body.account !== 'string') {
    throw new Error('account is required');
  }
  if (!body.tx) {
    throw new Error('tx payload is required');
  }

  const { to, amount, asset, ts } = body.tx;

  if (!to || typeof to !== 'string') {
    throw new Error('tx.to is required');
  }
  if (typeof amount !== 'number' && typeof amount !== 'string') {
    throw new Error('tx.amount must be a number or numeric string');
  }
  if (!asset || typeof asset !== 'string') {
    throw new Error('tx.asset is required');
  }
  if (!ts || typeof ts !== 'string') {
    throw new Error('tx.ts timestamp is required');
  }

  const numericAmount =
    typeof amount === 'number' ? amount : Number.parseFloat(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('tx.amount must be a positive number');
  }

  return {
    account: body.account,
    tx: {
      to,
      amount: numericAmount,
      asset,
      ts,
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RiskScoreRequest;
    const { account, tx } = parseRequest(body);
    
    // Parse account balance if provided
    let accountBalance: number | undefined;
    if (body.account_balance !== undefined) {
      const balanceValue = typeof body.account_balance === 'number' 
        ? body.account_balance 
        : Number.parseFloat(String(body.account_balance));
      
      if (Number.isFinite(balanceValue) && balanceValue >= 0) {
        accountBalance = balanceValue;
      }
    }

    const risk = await scoreTransaction(account, tx, accountBalance);

    return NextResponse.json({
      score: risk.score,
      bucket: risk.bucket,
      factors: risk.factors,
      reasons: risk.reasons,
      historySampleSize: risk.historySampleSize,
    });
  } catch (error) {
    console.error('Risk score error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    );
  }
}

