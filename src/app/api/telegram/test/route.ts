import { NextResponse } from 'next/server';
import { notifyTelegramRisk, isTelegramConfigured } from '@/lib/telegram';

/**
 * Test endpoint to send a sample Telegram notification
 * GET /api/telegram/test
 */
export async function GET() {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { 
        error: 'Telegram not configured',
        instructions: [
          '1. Create a bot via @BotFather in Telegram',
          '2. Get your bot token',
          '3. Start a chat with your bot and send a message',
          '4. Get your chat ID from https://api.telegram.org/bot<TOKEN>/getUpdates',
          '5. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env.local',
          '6. Restart dev server'
        ]
      },
      { status: 400 }
    );
  }

  try {
    const result = await notifyTelegramRisk({
      account: 'GDSR7X2QVJQX3Z6KJKJVKJVKJVKJVKJVKJVKJVKJVKJVKJVKJVKJVKJV',
      recipient: 'GBBU98QVJQX3Z6KJKJVKJVKJVKJVKJVKJVKJVKJVKJVKJVKJVKJV',
      amount: '5000',
      asset: 'USDC',
      score: 0.75,
      factors: [
        { name: 'new_recipient', value: 1, description: 'New recipient address' },
        { name: 'z_amount', value: 4.1, description: 'Amount 4.1× above normal' },
        { name: 'off_hours', value: 1, description: 'Transaction at 03:00 (outside typical 09:00-17:00)' }
      ],
      queueId: 'test-' + Date.now()
    });

    return NextResponse.json({
      success: true,
      message: 'Test notification sent! Check your Telegram.',
      result
    });
  } catch (error) {
    console.error('Telegram test error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
