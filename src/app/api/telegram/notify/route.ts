import { NextResponse } from 'next/server';
import { isTelegramConfigured, telegramFetch, getDefaultChatId } from '@/lib/telegram';

interface NotifyRequest {
  account: string;
  recipient: string;
  amount: string;
  asset: string;
  tx_hash?: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
}

export async function POST(request: Request) {
  try {
    if (!isTelegramConfigured()) {
      return NextResponse.json({ ok: true, message: 'Telegram not configured' });
    }

    const payload = (await request.json()) as NotifyRequest;
    const chatId = getDefaultChatId();

    if (!chatId) {
      return NextResponse.json({ ok: true, message: 'No chat ID configured' });
    }

    const { account, recipient, amount, asset, tx_hash, risk_score, risk_level } = payload;

    let message: string;
    
    if (risk_level === 'low') {
      message = `✅ *Transaction Completed*

A low-risk transaction has been successfully sent from your wallet.

📊 *Transaction Details*
• From: \`${account.slice(0, 8)}...${account.slice(-4)}\`
• To: \`${recipient.slice(0, 8)}...${recipient.slice(-4)}\`
• Amount: *${amount} ${asset}*
• Risk Score: ${risk_score.toFixed(2)} (Low)
${tx_hash ? `• Hash: \`${tx_hash.slice(0, 16)}...\`` : ''}

✨ *Status:* Sent directly to Stellar network
🔒 *Security:* No additional verification required`;
    } else {
      // Medium/high handled by notifyTelegramRisk
      return NextResponse.json({ ok: true });
    }

    await telegramFetch('sendMessage', {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    });

    console.log('✅ Low-risk Telegram notification sent');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram notify error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
