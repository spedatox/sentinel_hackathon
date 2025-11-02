import { NextResponse } from 'next/server';
import { setupTotp } from '@/lib/totp';

export const runtime = 'nodejs';

interface SetupRequest {
  account: string;
}

export async function POST(request: Request) {
  try {
    const { account } = (await request.json()) as SetupRequest;

    if (!account) {
      return NextResponse.json({ error: 'Account required' }, { status: 400 });
    }

    const { secret, uri, qrUri } = await setupTotp(account);

    return NextResponse.json({
      secret,
      uri,
      qrUri,
      message: 'TOTP setup successful. Scan QR code with Google Authenticator.',
    });
  } catch (error) {
    console.error('TOTP setup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Setup failed' },
      { status: 500 }
    );
  }
}
