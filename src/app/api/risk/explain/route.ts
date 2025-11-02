import { NextResponse } from 'next/server';
import { explainFactors, normalizeFactors } from '@/lib/explain';
import { generateAiRiskExplanation } from '@/lib/ai';
import { Features } from '@/lib/risk';

export const runtime = 'nodejs';

interface ExplainRequest {
  factors?: Partial<Features>;
  score?: number;
  reasons?: string[];
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ExplainRequest;
    if (!payload.factors) {
      throw new Error('factors are required');
    }
    const factors = normalizeFactors(payload.factors);
    const score = payload.score !== undefined ? Number(payload.score) : undefined;
    const reasons = Array.isArray(payload.reasons)
      ? payload.reasons.filter((item): item is string => typeof item === 'string')
      : [];

    const fallback = explainFactors(factors, { score, reasons });
    const ai = await generateAiRiskExplanation(factors, { score, reasons });
    const text = ai?.text ?? fallback;
    const source = ai?.source ?? 'rules';

    return NextResponse.json({ text, source });
  } catch (error) {
    console.error('Risk explain error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}
