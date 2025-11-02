/**
 * Mock OpenAI API for deterministic testing
 * Never makes real API calls - returns canned responses
 */

export type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OpenAIRequest = {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  timestamp: number;
};

export type OpenAIResponse = {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export class MockOpenAIClient {
  private requests: OpenAIRequest[] = [];
  private responseTemplate: string = 'This transaction appears risky due to {reasons}. Recommend step-up verification.';
  private failureMode: 'none' | 'rate_limit' | 'timeout' | 'invalid_key' = 'none';
  private promptTokenLimit = 4000;

  constructor() {
    this.reset();
  }

  /**
   * Reset mock to initial state
   */
  reset(): void {
    this.requests = [];
    this.responseTemplate = 'This transaction appears risky due to {reasons}. Recommend step-up verification.';
    this.failureMode = 'none';
    this.promptTokenLimit = 4000;
  }

  /**
   * Set custom response template
   */
  setResponseTemplate(template: string): void {
    this.responseTemplate = template;
  }

  /**
   * Set failure mode
   */
  setFailureMode(mode: 'none' | 'rate_limit' | 'timeout' | 'invalid_key'): void {
    this.failureMode = mode;
  }

  /**
   * Set prompt token limit (for testing truncation)
   */
  setPromptTokenLimit(limit: number): void {
    this.promptTokenLimit = limit;
  }

  /**
   * Get all captured requests
   */
  getRequests(): OpenAIRequest[] {
    return [...this.requests];
  }

  /**
   * Get last request
   */
  getLastRequest(): OpenAIRequest | null {
    return this.requests.length > 0 ? this.requests[this.requests.length - 1] : null;
  }

  /**
   * Clear captured requests
   */
  clearRequests(): void {
    this.requests = [];
  }

  /**
   * Mock chat.completions.create
   */
  async createChatCompletion(params: {
    model: string;
    messages: OpenAIMessage[];
    max_tokens?: number;
    temperature?: number;
  }): Promise<OpenAIResponse> {
    // Capture request
    const request: OpenAIRequest = {
      model: params.model,
      messages: params.messages,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      timestamp: Date.now(),
    };
    this.requests.push(request);

    // Simulate failure modes
    if (this.failureMode === 'rate_limit') {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    if (this.failureMode === 'timeout') {
      throw new Error('ETIMEDOUT');
    }

    if (this.failureMode === 'invalid_key') {
      throw new Error('Invalid API key provided');
    }

    // Check for sensitive data in prompts
    const promptText = params.messages.map((m) => m.content).join(' ');
    const sensitivePatterns = [
      // Stellar secret keys start with 'S'
      { pattern: /\bS[A-Z2-7]{55}\b/g, name: 'Stellar private key' },
      // TOTP secrets are exactly 16 or 32 base32 characters (but not Stellar addresses which start with G)
      { pattern: /\b(?!G)[A-Z2-7]{16}\b/g, name: 'TOTP secret' },
      { pattern: /\b(?!G)[A-Z2-7]{32}\b/g, name: 'TOTP secret' },
      // PEM-encoded keys
      { pattern: /-----BEGIN/i, name: 'Private key' },
      // Generic private key mentions with actual key data
      { pattern: /private[_\s]?key[_\s]*[:=]\s*[SA][A-Z0-9]{40,}/i, name: 'Private key' },
    ];

    for (const { pattern, name } of sensitivePatterns) {
      if (pattern.test(promptText)) {
        throw new Error(`Detected sensitive data in prompt: ${name}`);
      }
    }

    // Validate prompt is not too large
    const estimatedTokens = promptText.length / 4; // Rough estimation
    if (estimatedTokens > this.promptTokenLimit) {
      throw new Error(`Prompt too large: ${estimatedTokens} tokens > ${this.promptTokenLimit} limit`);
    }

    // Generate response based on request content
    let responseContent = this.responseTemplate;

    // Extract reasons from user message if present
    const userMessage = params.messages.find((m) => m.role === 'user');
    if (userMessage && userMessage.content.includes('reasons:')) {
      const reasonsMatch = userMessage.content.match(/reasons:\s*\[([^\]]+)\]/);
      if (reasonsMatch) {
        responseContent = responseContent.replace('{reasons}', reasonsMatch[1]);
      }
    }

    // Create deterministic response
    const response: OpenAIResponse = {
      id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      choices: [
        {
          message: {
            role: 'assistant',
            content: responseContent,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: Math.floor(promptText.length / 4),
        completion_tokens: Math.floor(responseContent.length / 4),
        total_tokens: Math.floor((promptText.length + responseContent.length) / 4),
      },
    };

    return response;
  }

  /**
   * Assert that no sensitive data was sent
   */
  assertNoSensitiveData(): void {
    const sensitivePatterns = [
      /-----BEGIN/i,
      /totp[_\s]?secret/i,
      /private[_\s]?key/i,
      /seed[_\s]?phrase/i,
      /mnemonic/i,
    ];

    for (const request of this.requests) {
      const fullText = request.messages.map((m) => m.content).join(' ');

      for (const pattern of sensitivePatterns) {
        if (pattern.test(fullText)) {
          throw new Error(
            `Sensitive data pattern "${pattern}" found in OpenAI request: ${fullText.substring(
              0,
              100,
            )}...`,
          );
        }
      }
    }
  }

  /**
   * Assert that addresses are redacted (only last 4 chars visible)
   */
  assertAddressesRedacted(): void {
    for (const request of this.requests) {
      const fullText = request.messages.map((m) => m.content).join(' ');

      // Look for full Stellar addresses (56 chars starting with G)
      // Must match exactly 56 characters
      const stellarAddressPattern = /\bG[A-Z2-7]{55}\b/g;
      const matches = fullText.match(stellarAddressPattern);

      if (matches && matches.length > 0) {
        throw new Error(
          `Un-redacted Stellar address found in OpenAI request: ${matches[0]}`,
        );
      }
    }
  }

  /**
   * Assert token limit respected
   */
  assertTokenLimitRespected(maxTokens: number): void {
    for (const request of this.requests) {
      const promptText = request.messages.map((m) => m.content).join(' ');
      const estimatedTokens = promptText.length / 4;

      if (estimatedTokens > maxTokens) {
        throw new Error(
          `Token limit exceeded: ${estimatedTokens} tokens > ${maxTokens} limit`,
        );
      }
    }
  }

  /**
   * Get total request count
   */
  getRequestCount(): number {
    return this.requests.length;
  }

  /**
   * Assert specific content in last request
   */
  assertLastRequestContains(text: string | RegExp): void {
    const lastRequest = this.getLastRequest();
    if (!lastRequest) {
      throw new Error('No requests captured');
    }

    const fullText = lastRequest.messages.map((m) => m.content).join(' ');

    if (typeof text === 'string') {
      if (!fullText.includes(text)) {
        throw new Error(`Expected text "${text}" not found in request`);
      }
    } else {
      if (!text.test(fullText)) {
        throw new Error(`Expected pattern ${text} not found in request`);
      }
    }
  }
}

// Singleton instance for tests
export const mockOpenAIClient = new MockOpenAIClient();

/**
 * Reset mock to initial state
 */
export function resetMockOpenAI(): void {
  mockOpenAIClient.reset();
}

/**
 * Helper to assert OpenAI was called
 */
export function assertOpenAICalled(expectedCount: number = 1): void {
  const actualCount = mockOpenAIClient.getRequestCount();
  if (actualCount !== expectedCount) {
    throw new Error(`Expected ${expectedCount} OpenAI calls, got ${actualCount}`);
  }
}

/**
 * Helper to assert OpenAI was not called
 */
export function assertOpenAINotCalled(): void {
  const actualCount = mockOpenAIClient.getRequestCount();
  if (actualCount > 0) {
    throw new Error(`Expected no OpenAI calls, got ${actualCount}`);
  }
}

/**
 * Create a deterministic canned response
 */
export function createCannedResponse(riskLevel: 'low' | 'medium' | 'high'): string {
  const templates = {
    low: 'This transaction appears normal based on your history. Amount and timing are consistent with typical patterns.',
    medium: 'This transaction shows some unusual characteristics. The amount or timing differs from your typical pattern. Verification recommended.',
    high: 'This transaction is highly unusual and potentially risky. Multiple risk factors detected including new recipient, unusual amount, or suspicious timing. Strong verification required.',
  };

  return templates[riskLevel];
}

/**
 * Export singleton instance for testing
 */
export const mockOpenAI = mockOpenAIClient;
