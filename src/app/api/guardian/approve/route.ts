import { NextResponse } from 'next/server';
import { getPendingTx, markPendingTxApproved, deletePendingTx } from '@/lib/storage';
import { requestGuardianCosign } from '@/lib/guardian';
import { editAlertMessage } from '@/lib/telegram';

interface GuardianApproveRequest {
  tx_id?: string;
  chatId?: number | string;
  messageId?: number;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as GuardianApproveRequest;
    if (!payload.tx_id || typeof payload.tx_id !== 'string') {
      throw new Error('tx_id is required');
    }

    const pending = await getPendingTx(payload.tx_id);
    if (!pending) {
      throw new Error('Pending transaction not found');
    }

    if (pending.status === 'expired') {
      throw new Error('Pending transaction already expired');
    }

    // Determine risk level from score
    const riskLevel = !pending.riskScore ? 'medium' : 
                      pending.riskScore >= 0.5 ? 'high' : 
                      pending.riskScore >= 0.2 ? 'medium' : 'low';

    const guardianResponse = await requestGuardianCosign(pending.txId, pending.unsignedXdr, riskLevel);

    if (!guardianResponse.success) {
      throw new Error(guardianResponse.error || 'Guardian signer rejected request');
    }

    // For now, return the XDR to the frontend for user signing
    // In production with Guardian configured, this would be fully signed
    // For medium-risk without Guardian, user needs to sign in wallet

    await markPendingTxApproved(pending.txId);

    if (payload.chatId && payload.messageId) {
      await editAlertMessage(
        payload.chatId,
        payload.messageId,
        'Approved. Please sign in your wallet to complete the transaction.'
      ).catch((err) => {
        console.error('Failed to edit Telegram message', err);
      });
    }

    // Don't delete yet - frontend will need the data
    // await deletePendingTx(pending.txId);

    return NextResponse.json({
      tx_id: pending.txId,
      xdr_to_sign: guardianResponse.signed_xdr, // User needs to sign this
      needs_user_signature: true,
      guardian: guardianResponse,
    });
  } catch (error) {
    console.error('Guardian approve error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

