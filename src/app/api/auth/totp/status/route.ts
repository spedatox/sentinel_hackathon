import { NextResponse } from 'next/server';
import { isTotpEnabled } from '@/lib/totp';

export const runtime = 'nodejs';

interface StatusRequest {
  account: string;
  action?: string;
}

export async function POST(request: Request) {
  try {
    const { account, action } = (await request.json()) as StatusRequest;

    if (!account) {
      return NextResponse.json({ error: 'Account required' }, { status: 400 });
    }

    if (action) {
      return NextResponse.json(
        { error: 'Disabling Google Authenticator is not supported' },
        { status: 400 }
      );
    }

    const enabled = await isTotpEnabled(account);
    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('TOTP status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    );
  }
}
