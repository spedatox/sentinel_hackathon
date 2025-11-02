/**
 * Mock Telegram Bot API for deterministic testing
 * Captures all sent messages for assertions
 */

export type TelegramMessage = {
  chat_id: string;
  text: string;
  parse_mode?: string;
  reply_markup?: any;
  timestamp: number;
};

export type TelegramCallbackQuery = {
  id: string;
  data: string;
  message?: {
    chat: { id: number };
    message_id: number;
  };
};

export class MockTelegramBot {
  private sentMessages: TelegramMessage[] = [];
  private sentAnswers: Array<{ callback_query_id: string; text: string }> = [];
  private failureMode: 'none' | '429' | '500' | 'timeout' = 'none';
  private retryCount = 0;

  constructor() {
    this.reset();
  }

  /**
   * Reset mock to initial state
   */
  reset(): void {
    this.sentMessages = [];
    this.sentAnswers = [];
    this.failureMode = 'none';
    this.retryCount = 0;
  }

  /**
   * Set failure mode for testing retry logic
   */
  setFailureMode(mode: 'none' | '429' | '500' | 'timeout'): void {
    this.failureMode = mode;
  }

  /**
   * Get all sent messages
   */
  getSentMessages(): TelegramMessage[] {
    return [...this.sentMessages];
  }

  /**
   * Get last sent message
   */
  getLastMessage(): TelegramMessage | null {
    return this.sentMessages.length > 0
      ? this.sentMessages[this.sentMessages.length - 1]
      : null;
  }

  /**
   * Clear sent messages
   */
  clearMessages(): void {
    this.sentMessages = [];
    this.sentAnswers = [];
  }

  /**
   * Get retry count
   */
  getRetryCount(): number {
    return this.retryCount;
  }

  /**
   * Mock sendMessage
   */
  async sendMessage(params: {
    chat_id: string | number;
    text: string;
    parse_mode?: string;
    reply_markup?: any;
  }): Promise<{ ok: boolean; result?: any; error?: string }> {
    // Simulate failure modes
    if (this.failureMode === '429') {
      this.retryCount++;
      return {
        ok: false,
        error: 'Too Many Requests: retry after 5',
      };
    }

    if (this.failureMode === '500') {
      this.retryCount++;
      return {
        ok: false,
        error: 'Internal Server Error',
      };
    }

    if (this.failureMode === 'timeout') {
      this.retryCount++;
      throw new Error('ETIMEDOUT');
    }

    // Success case
    const message: TelegramMessage = {
      chat_id: String(params.chat_id),
      text: params.text,
      parse_mode: params.parse_mode,
      reply_markup: params.reply_markup,
      timestamp: Date.now(),
    };

    this.sentMessages.push(message);

    return {
      ok: true,
      result: {
        message_id: this.sentMessages.length,
        chat: { id: Number(params.chat_id) },
        text: params.text,
      },
    };
  }

  /**
   * Mock answerCallbackQuery
   */
  async answerCallbackQuery(params: {
    callback_query_id: string;
    text?: string;
  }): Promise<{ ok: boolean }> {
    this.sentAnswers.push({
      callback_query_id: params.callback_query_id,
      text: params.text || '',
    });

    return { ok: true };
  }

  /**
   * Mock editMessageText
   */
  async editMessageText(params: {
    chat_id: string | number;
    message_id: number;
    text: string;
    parse_mode?: string;
    reply_markup?: any;
  }): Promise<{ ok: boolean }> {
    // Just record as a new message for simplicity
    const message: TelegramMessage = {
      chat_id: String(params.chat_id),
      text: `[EDIT] ${params.text}`,
      parse_mode: params.parse_mode,
      reply_markup: params.reply_markup,
      timestamp: Date.now(),
    };

    this.sentMessages.push(message);
    return { ok: true };
  }

  /**
   * Assert that a message was sent
   */
  assertMessageSent(expectedText: string | RegExp): void {
    const found = this.sentMessages.some((msg) => {
      if (typeof expectedText === 'string') {
        return msg.text.includes(expectedText);
      }
      return expectedText.test(msg.text);
    });

    if (!found) {
      throw new Error(
        `Expected message matching "${expectedText}" not found. Sent messages: ${JSON.stringify(
          this.sentMessages.map((m) => m.text),
        )}`,
      );
    }
  }

  /**
   * Assert that inline buttons are present
   */
  assertInlineButtons(buttonTexts: string[]): void {
    const lastMessage = this.getLastMessage();
    if (!lastMessage) {
      throw new Error('No messages sent');
    }

    if (!lastMessage.reply_markup || !lastMessage.reply_markup.inline_keyboard) {
      throw new Error('No inline keyboard in last message');
    }

    const buttons = lastMessage.reply_markup.inline_keyboard.flat();
    for (const expectedText of buttonTexts) {
      const found = buttons.some((btn: any) => btn.text === expectedText);
      if (!found) {
        throw new Error(`Button "${expectedText}" not found in inline keyboard`);
      }
    }
  }

  /**
   * Assert that a specific callback was answered
   */
  assertCallbackAnswered(callbackQueryId: string): void {
    const found = this.sentAnswers.some(
      (answer) => answer.callback_query_id === callbackQueryId,
    );

    if (!found) {
      throw new Error(`Callback query ${callbackQueryId} was not answered`);
    }
  }

  /**
   * Assert message count
   */
  assertMessageCount(expectedCount: number): void {
    const actualCount = this.sentMessages.length;
    if (actualCount !== expectedCount) {
      throw new Error(`Expected ${expectedCount} messages, got ${actualCount}`);
    }
  }

  /**
   * Get message by index
   */
  getMessageAt(index: number): TelegramMessage | null {
    return this.sentMessages[index] || null;
  }
}

// Singleton instance for tests
export const mockTelegramBot = new MockTelegramBot();

/**
 * Reset mock to initial state
 */
export function resetMockTelegram(): void {
  mockTelegramBot.reset();
}

/**
 * Helper to create a test callback query
 */
export function createTestCallbackQuery(data: string, chatId: number = 123456789): TelegramCallbackQuery {
  return {
    id: `cbq_${Date.now()}_${Math.random()}`,
    data,
    message: {
      chat: { id: chatId },
      message_id: Math.floor(Math.random() * 1000),
    },
  };
}

/**
 * Helper to assert high-risk notification sent
 */
export function assertHighRiskNotificationSent(): void {
  mockTelegramBot.assertMessageSent(/⚠️.*high risk/i);
  mockTelegramBot.assertInlineButtons(['✅ Approve', '🔒 Lock Account']);
}

/**
 * Helper to assert transaction completion notification sent
 */
export function assertCompletionNotificationSent(): void {
  mockTelegramBot.assertMessageSent(/✅.*completed/i);
  mockTelegramBot.assertInlineButtons(['✅ Yes, it was me', '❌ No, freeze account']);
}
