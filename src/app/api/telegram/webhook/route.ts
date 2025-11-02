import { NextResponse } from 'next/server';
import {
  answerCallbackQuery,
  sendFollowUpMessage,
} from '@/lib/telegram';
import {
  getPendingTx,
  addAllowlistedRecipient,
} from '@/lib/storage';

interface TelegramUser {
  id: number;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  chat: { id: number | string };
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  callback_query?: TelegramCallbackQuery;
}

async function handleDetails(shortOrFullId: string, callback: TelegramCallbackQuery) {
  const messageText = callback.message?.text || '';
  const queueIdMatch = messageText.match(/Queue ID: `?([a-f0-9-]+)`?/);
  const txId = queueIdMatch ? queueIdMatch[1] : shortOrFullId;
  
  const pending = await getPendingTx(txId);
  if (!pending) {
    await answerCallbackQuery(callback.id, 'Transaction not found', true);
    return;
  }
  await answerCallbackQuery(callback.id, 'Opening details...');
  if (callback.message) {
    await sendFollowUpMessage(
      callback.message.chat.id,
      `Details for ${txId}\nUnsigned XDR:\n${pending.unsignedXdr}`
    );
  }
}

async function handleProbe(shortOrFullId: string, callback: TelegramCallbackQuery) {
  const messageText = callback.message?.text || '';
  const queueIdMatch = messageText.match(/Queue ID: `?([a-f0-9-]+)`?/);
  const txId = queueIdMatch ? queueIdMatch[1] : shortOrFullId;
  
  await answerCallbackQuery(callback.id, 'Simulating 1 USDC probe...');
  if (callback.message) {
    await sendFollowUpMessage(
      callback.message.chat.id,
      `Simulated a 1 USDC test payment for ${txId}. No funds moved.`
    );
  }
}

async function handleLock(txId: string, callback: TelegramCallbackQuery) {
  await answerCallbackQuery(callback.id, 'Locking send capability for 1 hour...');
  if (callback.message) {
    await sendFollowUpMessage(
      callback.message.chat.id,
      `Locked new transfers for account tied to ${txId} for 1 hour (simulation).`
    );
  }
}

async function handleMarkSafe(recipient: string, callback: TelegramCallbackQuery) {
  await answerCallbackQuery(callback.id, 'Recipient marked safe.');
  if (callback.message) {
    const key = `chat:${callback.message.chat.id}`;
    addAllowlistedRecipient(key, recipient);
    await sendFollowUpMessage(
      callback.message.chat.id,
      `✅ Recipient \`${recipient.slice(0, 8)}...\` marked as trusted.\n\nFuture transactions to this address will have lower risk scores.`
    );
  }
}

export async function POST(request: Request) {
  console.log('📥 Webhook received');
  const payload = (await request.json()) as TelegramUpdate;
  console.log('📦 Webhook payload:', JSON.stringify(payload, null, 2));
  
  if (!payload.callback_query || !payload.callback_query.data) {
    console.log('⚠️ No callback_query in payload');
    return NextResponse.json({ ok: true });
  }

  const { callback_query: callback } = payload;
  const [action, arg] = callback.data!.split(':');
  console.log(`🔘 Button clicked - Action: ${action}, Arg: ${arg}`);

  // Map shortened actions to full actions
  const actionMap: Record<string, string> = {
    'D': 'DETAILS',
    'P': 'PROBE',
    'L': 'LOCK1H',
    'S': 'MARKSAFE',
  };

  const fullAction = actionMap[action] || action;

  switch (fullAction) {
    case 'DETAILS':
      await handleDetails(arg, callback);
      break;
    case 'PROBE':
      await handleProbe(arg, callback);
      break;
    case 'LOCK1H':
      await handleLock(arg, callback);
      break;
    case 'MARKSAFE':
      await handleMarkSafe(arg, callback);
      break;
    default:
      await answerCallbackQuery(callback.id, 'Unsupported action', true);
  }

  return NextResponse.json({ ok: true });
}
