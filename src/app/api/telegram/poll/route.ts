import { NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let lastUpdateId = 0;

export async function GET() {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 });
  }

  try {
    // Get updates from Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.ok && data.result && data.result.length > 0) {
      // Update last update ID
      lastUpdateId = data.result[data.result.length - 1].update_id;
      
      // Process each update
      for (const update of data.result) {
        if (update.callback_query) {
          console.log('🔄 Processing callback query:', update.callback_query.data);
          
          // Forward to webhook handler
          const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/telegram/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update),
          });
          
          const webhookResult = await webhookResponse.json();
          console.log('✅ Webhook response:', webhookResult);
        }
      }
      
      return NextResponse.json({ 
        ok: true, 
        processed: data.result.length,
        message: 'Updates processed' 
      });
    }

    return NextResponse.json({ ok: true, processed: 0, message: 'No updates' });
  } catch (error) {
    console.error('Polling error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
