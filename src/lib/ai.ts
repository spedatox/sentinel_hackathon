import OpenAI from "openai";
import type { Features } from "@/lib/risk";
import { listFactorHighlights } from "@/lib/explain";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!apiKey) {
    return null;
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

function buildUserPrompt(factors: Features, score?: number, reasons: string[] = [], language: 'en' | 'tr' = 'en') {
  const highlights = listFactorHighlights(factors, reasons);
  const scoreLine = score !== undefined ? score.toFixed(2) : "unknown";
  const factorLines = highlights.length ? highlights.join("; ") : (language === 'tr' ? "risk anomalisi tespit edilmedi" : "no risk anomalies surfaced");
  const reasonLine = reasons.length ? (language === 'tr' ? `Kural tabanlı nedenler: ${reasons.join("; ")}.` : `Rule-based reasons: ${reasons.join("; ")}.`) : undefined;

  if (language === 'tr') {
    return [
      "Sen Sentinel'sin, bir Stellar cüzdan güvenlik analistisin.",
      "Risk skorunu haklı çıkaran ve sonraki adımları öneren kısa bir paragraf (<=80 kelime) oluştur.",
      "Yapay zeka modeli olduğundan bahsetme. Dostça uyumluluk tonu kullan.",
      `Risk skoru: ${scoreLine}.`,
      `Gözlemlenen faktörler: ${factorLines}.`,
      reasonLine,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "You are Sentinel, a Stellar wallet security analyst.",
    "Produce one concise paragraph (<=80 words) that justifies the risk score and recommends next steps.",
    "Do not mention you are an AI model. Use friendly compliance tone.",
    `Risk score: ${scoreLine}.`,
    `Observed factors: ${factorLines}.`,
    reasonLine,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateAiRiskExplanation(
  factors: Features,
  options: { score?: number; reasons?: string[]; language?: 'en' | 'tr' } = {},
): Promise<{ text: string; source: "ai" } | null> {
  const { score, reasons = [], language = 'en' } = options;
  const openai = getClient();
  if (!openai) {
    return null;
  }

  try {
    const systemContent = language === 'tr'
      ? "Sen Sentinel'in güvenlik analistisin. İşlem riskini açık bir şekilde Türkçe olarak bir paragraf ile açıkla ve bir eylem önerisi ile bitir."
      : "You are Sentinel's security analyst. Explain transaction risk clearly in plain English with one paragraph and end with an action recommendation.";

    const response = await openai.responses.create({
      model,
      max_output_tokens: 200,
      input: [
        {
          role: "system",
          content: systemContent,
        },
        {
          role: "user",
          content: buildUserPrompt(factors, score, reasons, language),
        },
      ],
      temperature: 0.2,
    });

    const text = response.output_text?.trim();
    if (!text) {
      return null;
    }

    return { text, source: "ai" };
  } catch (error) {
    console.error("AI explanation failed:", error);
    return null;
  }
}

/**
 * Generate AI-powered Telegram notification message for risky transactions
 */
export async function generateTelegramAlert(params: {
  account: string;
  recipient: string;
  amount: string;
  asset: string;
  score: number;
  factors: Array<{ name: string; value: number; description: string }>;
  riskLevel: 'low' | 'medium' | 'high';
  language?: 'en' | 'tr';
}): Promise<string | null> {
  const openai = getClient();
  if (!openai) {
    return null; // Fall back to template
  }

  const { account, recipient, amount, asset, score, factors, riskLevel, language = 'en' } = params;

  const factorsList = factors.map(f => `- ${f.description} (${f.name}: ${f.value})`).join('\n');
  
  const langInstruction = language === 'tr' 
    ? 'Generate the alert message in TURKISH (Türkçe).'
    : 'Generate the alert message in English.';
  
  const prompt = `You are Sentinel, a Stellar wallet security assistant. Generate a Telegram alert message for a ${riskLevel}-risk transaction. ${langInstruction}

Transaction Details:
- From: ${account.slice(0, 8)}...${account.slice(-8)}
- To: ${recipient.slice(0, 8)}...${recipient.slice(-8)}
- Amount: ${amount} ${asset}
- Risk Score: ${score.toFixed(2)}
- Risk Level: ${riskLevel.toUpperCase()}

Risk Factors Detected:
${factorsList}

Requirements:
1. Start with an emoji (⚠️ for medium, 🚨 for high)
2. Write a concise, urgent alert (max 3 sentences)
3. Explain WHY this is risky in plain English
4. Tell the user what action to take (approve/deny)
5. Use friendly but serious security tone
6. Keep total length under 200 words
7. Do NOT include buttons or formatting - just plain text

Generate the alert message now:`;

  try {
    const systemContent = language === 'tr'
      ? 'Sen Sentinel\'sin, Stellar cüzdanları için bir güvenlik asistanısın. Net, acil ve eyleme dönük güvenlik uyarıları oluştur (Türkçe).'
      : 'You are Sentinel, a security assistant for Stellar wallets. Generate clear, urgent, actionable security alerts.';
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: systemContent,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 250,
    });

    const text = response.choices[0]?.message?.content?.trim();
    return text || null;
  } catch (error) {
    console.error("AI Telegram alert generation failed:", error);
    return null;
  }
}
