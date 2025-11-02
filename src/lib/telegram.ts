import { translations } from './i18n';

const TELEGRAM_API_BASE = "https://api.telegram.org";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export interface TelegramButton {
  text: string;
  callback_data: string;
}

export interface TelegramAlertParams {
  chatId: number | string;
  summary: string;
  buttons: TelegramButton[];
  parseMode?: "Markdown" | "MarkdownV2" | "HTML";
}

export async function telegramFetch<T>(method: string, payload: Record<string, unknown>): Promise<T | null> {
  if (!BOT_TOKEN) {
    return null;
  }

  const url = `${TELEGRAM_API_BASE}/bot${BOT_TOKEN}/${method}`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram API error (${method}): ${text}`);
  }

  return res.json();
}

export async function sendAlert(params: TelegramAlertParams) {
  return telegramFetch("sendMessage", {
    chat_id: params.chatId,
    text: params.summary,
    parse_mode: params.parseMode || "Markdown",
    reply_markup: {
      inline_keyboard: [
        params.buttons.map((button) => ({
          text: button.text,
          callback_data: button.callback_data,
        })),
      ],
    },
  });
}

export async function editAlertMessage(chatId: number | string, messageId: number, text: string) {
  return telegramFetch("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert = false,
) {
  return telegramFetch("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

export async function sendFollowUpMessage(chatId: number | string, text: string) {
  return telegramFetch("sendMessage", {
    chat_id: chatId,
    text,
  });
}

// Helper to get default chat ID
export function getDefaultChatId(): string | number | null {
  return CHAT_ID || null;
}

// Check if Telegram is configured
export function isTelegramConfigured(): boolean {
  return !!(BOT_TOKEN && CHAT_ID);
}

// Risk notification helper
export interface RiskNotificationParams {
  account: string;
  recipient: string;
  amount: string;
  asset: string;
  score: number;
  factors: Array<{ name: string; value: number; description: string }>;
  queueId: string;
  language?: 'en' | 'tr';
}

export async function notifyTelegramRisk(params: RiskNotificationParams) {
  const chatId = getDefaultChatId();
  if (!chatId) {
    return null;
  }

  const { account, recipient, amount, asset, score, factors, queueId, language = 'en' } = params;
  const t = translations[language].telegram;
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'high';
  if (score < 0.2) riskLevel = 'low';
  else if (score < 0.5) riskLevel = 'medium';

  // Try to generate AI message first (in the selected language)
  let aiMessage: string | null = null;
  try {
    const { generateTelegramAlert } = await import('@/lib/ai');
    aiMessage = await generateTelegramAlert({
      account,
      recipient,
      amount,
      asset,
      score,
      factors,
      riskLevel,
      language,
    });
  } catch (error) {
    // Silently fall back to template
  }

  // Use AI message or fall back to template
  let message: string;
  
  if (aiMessage) {
    // Add transaction details and queue ID to AI message
    message = `${aiMessage}

📊 *${t.transactionDetails}*
• ${t.from}: \`${account.slice(0, 8)}...${account.slice(-4)}\`
• ${t.to}: \`${recipient.slice(0, 8)}...${recipient.slice(-4)}\`
• ${t.amount}: *${amount} ${asset}*
• ${t.riskScore}: ${score.toFixed(2)}

${t.queueId}: \`${queueId}\``;
  } else {
    // Fall back to template
    const time = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const factorsList = factors.map(f => `✗ ${f.description}`).join('\n');
    const riskLevelDisplay = riskLevel === 'high' ? t.high : riskLevel === 'medium' ? t.medium : t.low;
    const emoji = riskLevel === 'high' ? '🚨' : '⚠️';

    message = `${emoji} *${t.alertPrefix}*

${t.transactionDetected}:
• ${t.from}: \`${account.slice(0, 8)}...\`
• ${t.to}: \`${recipient.slice(0, 8)}...\`
• ${t.amount}: *${amount} ${asset}*
• ${t.time}: ${time} UTC
• ${t.risk}: *${riskLevelDisplay}* (${t.scoreLabel} ${score.toFixed(2)})

*${t.riskFactors}:*
${factorsList}

${riskLevel === 'high' ? `🔐 ${t.guardianRequired}` : `✅ ${t.totpRequired}`}

${t.queueId}: \`${queueId}\``;
  }

  // Shorten IDs for Telegram callback_data (64 byte limit)
  const shortQueueId = queueId ? queueId.slice(0, 8) : 'unknown';
  const shortAccount = account.slice(0, 8);
  const shortRecipient = recipient.slice(0, 8);

  // Button labels based on language (buttons are informational only)
  const detailsLabel = language === 'tr' ? 'ℹ️ Detaylar' : 'ℹ️ Details';
  const probeLabel = language === 'tr' ? '🔍 İncele' : '🔍 Probe';
  const lockLabel = language === 'tr' ? '🔒 1s Kilitle' : '🔒 Lock 1h';
  const safeLabel = language === 'tr' ? '✓ Güvenli İşaretle' : '✓ Mark Safe';

  const buttons: TelegramButton[][] = [
    [
      { text: detailsLabel, callback_data: `D:${shortQueueId}` },
      { text: probeLabel, callback_data: `P:${shortQueueId}` }
    ],
    [
      { text: lockLabel, callback_data: `L:${shortAccount}` },
      { text: safeLabel, callback_data: `S:${shortRecipient}` }
    ]
  ];

  return telegramFetch("sendMessage", {
    chat_id: chatId,
    text: message,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
}

// Post-transaction confirmation (notification-only, no action buttons)
export async function notifyTransactionComplete(params: {
  account: string;
  recipient: string;
  amount: string;
  asset: string;
  hash: string;
  language?: 'en' | 'tr';
}) {
  const chatId = getDefaultChatId();
  if (!chatId) return null;

  const { account, recipient, amount, asset, hash, language = 'en' } = params;
  const t = translations[language].telegram;

  // Try to generate AI confirmation message (in the selected language)
  let aiMessage: string | null = null;
  try {
    const openaiClient = await import('openai').then(m => m.default);
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const langInstruction = language === 'tr' 
        ? 'Generate a short post-transaction confirmation message in TURKISH (2-3 sentences).'
        : 'Generate a short post-transaction confirmation message (2-3 sentences).';
      const prompt = `${langInstruction} Transaction: ${amount} ${asset} sent to ${recipient.slice(0, 8)}... Be concise and friendly.`;
      
      const client = new openaiClient({ apiKey });
      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages: [
          { role: 'system', content: language === 'tr' ? 'Sen Sentinel\'sin. Kısa, dostça işlem onay mesajları oluştur (Türkçe).' : 'You are Sentinel. Generate short, friendly transaction confirmation messages.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 100,
      });
      aiMessage = response.choices[0]?.message?.content?.trim() || null;
    }
  } catch (error) {
    console.error('AI confirmation message failed:', error);
  }

  let message: string;
  
  if (aiMessage) {
    message = `✅ *${t.transactionCompleted}*

${aiMessage}

📊 *${t.details}:*
• ${t.from}: \`${account.slice(0, 8)}...${account.slice(-4)}\`
• ${t.to}: \`${recipient.slice(0, 8)}...${recipient.slice(-4)}\`
• ${t.amount}: *${amount} ${asset}*
• ${t.hash}: \`${hash.slice(0, 12)}...\``;
  } else {
    // Fall back to template
    message = `✅ *${t.transactionCompleted}*

${t.from}: \`${account.slice(0, 8)}...\`
${t.to}: \`${recipient.slice(0, 8)}...\`
${t.amount}: *${amount} ${asset}*
${t.hash}: \`${hash.slice(0, 12)}...\`

${t.transactionSuccess}`;
  }

  return telegramFetch("sendMessage", {
    chat_id: chatId,
    text: message,
    parse_mode: "Markdown",
  });
}
