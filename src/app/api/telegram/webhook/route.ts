import { NextResponse } from 'next/server';
import {
  answerCallbackQuery,
  editAlertMessage,
  sendFollowUpMessage,
} from '@/lib/telegram';
import {
  getPendingTx,
  markPendingTxApproved,
  deletePendingTx,
  addAllowlistedRecipient,
} from '@/lib/storage';
import { requestGuardianCosign } from '@/lib/guardian';

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

async function handleApprove(shortOrFullId: string, callback: TelegramCallbackQuery) {
  console.log('🔍 handleApprove called with ID:', shortOrFullId);
  
  // Try to find by full ID first, then by prefix
  let pending = await getPendingTx(shortOrFullId);
  console.log('📝 First lookup result:', pending ? 'Found' : 'Not found');
  
  // If not found and ID is short (8 chars), search by prefix
  if (!pending && shortOrFullId.length === 8) {
    // This is a simplified approach - in production you'd want a proper lookup table
    // For now, we'll extract the full ID from the message text
    const messageText = callback.message?.text || '';
    console.log('📄 Message text length:', messageText.length);
    // Try both with and without backticks
    const queueIdMatch = messageText.match(/Queue ID: `?([a-f0-9-]+)`?/);
    console.log('🎯 Regex match:', queueIdMatch ? queueIdMatch[1] : 'No match');
    
    if (queueIdMatch) {
      const fullId = queueIdMatch[1];
      console.log('🔎 Trying to find with full ID:', fullId);
      pending = await getPendingTx(fullId);
      console.log('📝 Second lookup result:', pending ? 'Found' : 'Not found');
    }
  }
  
  if (!pending) {
    console.log('❌ Transaction not found, answering callback');
    await answerCallbackQuery(callback.id, 'Transaction no longer pending', true);
    return;
  }
  
  console.log('✅ Transaction found:', pending.txId);
  
  const txId = pending.txId;
  if (pending.status === 'expired') {
    await answerCallbackQuery(callback.id, 'Transaction expired', true);
    return;
  }

  try {
    // Determine risk level from score
    const riskLevel = !pending.riskScore ? 'medium' : 
                      pending.riskScore >= 0.5 ? 'high' : 
                      pending.riskScore >= 0.2 ? 'medium' : 'low';

    const response = await requestGuardianCosign(txId, pending.unsignedXdr, riskLevel);
    if (!response.success) {
      throw new Error(response.error || 'Guardian signer rejected request');
    }

    await markPendingTxApproved(txId);
    await answerCallbackQuery(callback.id, '✅ Approved!');

    if (callback.message) {
      await editAlertMessage(
        callback.message.chat.id,
        callback.message.message_id,
  '✅ *Approved and Sent*\n\nTransaction is processing on the Stellar network. It will appear in your transaction history shortly.'
      );
    }

    await deletePendingTx(txId);
  } catch (error) {
    console.error('Telegram approval error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to approve transaction';
    await answerCallbackQuery(callback.id, errorMsg, true);
    
    // Also update the message to show the error
    if (callback.message) {
      await editAlertMessage(
        callback.message.chat.id,
        callback.message.message_id,
        `❌ *Approval Failed*\n\n${errorMsg}\n\nPlease try again or contact support if the issue persists.`
      ).catch(err => console.error('Failed to edit message:', err));
    }
  }
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
    'A': 'APPROVE',
    'D': 'DETAILS',
    'P': 'PROBE',
    'L': 'LOCK1H',
    'S': 'MARKSAFE',
  };

  const fullAction = actionMap[action] || action;

  switch (fullAction) {
    case 'APPROVE':
      await handleApprove(arg, callback);
      break;
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
