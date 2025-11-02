import { NextResponse } from 'next/server';
import { sendAlert } from '@/lib/telegram';
import { addAllowlistedRecipient } from '@/lib/storage';

type AllowedAction =
  | {
      op: 'notify_telegram';
      chatId: number | string;
      summary: string;
      buttons?: { text: string; callback_data: string }[];
    }
  | {
      op: 'mark_safe';
      account: string;
      recipient: string;
    }
  | {
      op: 'simulate_test_payment';
      account: string;
      amount: number;
    };

interface ActionExecuteRequest {
  actions?: Array<AllowedAction & Record<string, unknown>>;
}

function assertAllowed(action: Record<string, unknown>): action is AllowedAction {
  if (!action.op || typeof action.op !== 'string') {
    return false;
  }
  if (action.op === 'notify_telegram') {
    return (
      (typeof action.chatId === 'number' || typeof action.chatId === 'string') &&
      typeof action.summary === 'string'
    );
  }
  if (action.op === 'mark_safe') {
    return typeof action.account === 'string' && typeof action.recipient === 'string';
  }
  if (action.op === 'simulate_test_payment') {
    return (
      typeof action.account === 'string' &&
      typeof action.amount === 'number' &&
      action.amount > 0
    );
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ActionExecuteRequest;
    if (!payload.actions || !Array.isArray(payload.actions)) {
      throw new Error('actions array required');
    }

    for (const action of payload.actions) {
      if (!assertAllowed(action)) {
        throw new Error(`Unsupported or invalid action: ${JSON.stringify(action)}`);
      }
      switch (action.op) {
        case 'notify_telegram':
          await sendAlert({
            chatId: action.chatId,
            summary: action.summary,
            buttons: action.buttons || [],
          });
          break;
        case 'mark_safe':
          addAllowlistedRecipient(action.account, action.recipient);
          break;
        case 'simulate_test_payment':
          // Simulation only; in a full implementation this would craft a payment preview.
          console.log(
            `Simulated test payment of ${action.amount} for account ${action.account}`
          );
          break;
        default:
          // Should never hit due to validation.
          throw new Error('Unhandled action');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Action execute error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

