import { NextResponse } from 'next/server';
import { verifyTotpCode } from '@/lib/totp';

export const runtime = 'nodejs';

interface VerifyRequest {
  account: string;
  code: string;
}

export async function POST(request: Request) {
  try {
    const { account, code } = (await request.json()) as VerifyRequest;

    if (!account || !code) {
      return NextResponse.json(
        { error: 'Account and code required' },
        { status: 400 }
      );
    }

    const valid = await verifyTotpCode(account, code);

    if (valid) {
      return NextResponse.json({ valid: true, message: 'Code verified successfully' });
    } else {
      return NextResponse.json(
        { valid: false, message: 'Invalid code' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('TOTP verification error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}
