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
  language?: 'en' | 'tr';
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

    const { account, recipient, amount, asset, tx_hash, risk_score, risk_level, language = 'en' } = payload;
    
    // Import translations
    const { translations } = await import('@/lib/i18n');
    const t = translations[language].telegram;

    let message: string;
    
    if (risk_level === 'low') {
      const statusSent = language === 'tr' ? 'Doğrudan Stellar ağına gönderildi' : 'Sent directly to Stellar network';
      const securityNote = language === 'tr' ? 'Ek doğrulama gerektirmiyor' : 'No additional verification required';
      const successNote = language === 'tr' ? 'Düşük riskli bir işlem cüzdanınızdan başarıyla gönderildi.' : 'A low-risk transaction has been successfully sent from your wallet.';
      
      message = `✅ *${t.transactionCompleted}*

${successNote}

📊 *${t.transactionDetails}*
• ${t.from}: \`${account.slice(0, 8)}...${account.slice(-4)}\`
• ${t.to}: \`${recipient.slice(0, 8)}...${recipient.slice(-4)}\`
• ${t.amount}: *${amount} ${asset}*
• ${t.riskScore}: ${risk_score.toFixed(2)} (${t.low})
${tx_hash ? `• ${t.hash}: \`${tx_hash.slice(0, 16)}...\`` : ''}

✨ *${language === 'tr' ? 'Durum' : 'Status'}:* ${statusSent}
🔒 *${language === 'tr' ? 'Güvenlik' : 'Security'}:* ${securityNote}`;
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
