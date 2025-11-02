import { describe, it, expect, beforeEach } from 'vitest';
import { mockOpenAI, type MockOpenAIClient, createCannedResponse } from '../mocks/openai';

describe('AI Glue - OpenAI Adapter', () => {
  let client: MockOpenAIClient;

  beforeEach(() => {
    client = mockOpenAI;
    client.reset();
  });

  it('should not leak private keys in prompts', async () => {
    const sensitiveData = {
      privateKey: 'SDHF7ASDF8HASDF8H7ASDF8H7ASDF8H7ASDF8H7ASDF8H7ASDFH',
      amount: 100,
      to: 'GDSR...RECIPIENT',
    };

    // Include private key in prompt (which should be detected)
    const prompt = `Explain transaction: privateKey=${sensitiveData.privateKey}, amount=${sensitiveData.amount}, to=${sensitiveData.to}`;

    await expect(async () => {
      await client.createChatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
      });
    }).rejects.toThrow('sensitive data');
  });

  it('should not leak TOTP secrets in prompts', async () => {
    const totpSecret = 'JBSWY3DPEHPK3PXP';
    const prompt = `User TOTP secret is ${totpSecret}`;

    try {
      await client.createChatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
      });
    } catch (error: any) {
      expect(error.message).toContain('sensitive data');
    }

    expect(() => {
      client.assertNoSensitiveData();
    }).toThrow();
  });

  it('should detect full Stellar addresses', async () => {
    // Valid Stellar address - exactly 56 chars, starts with G, base32
    const fullAddress = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
    const prompt = `Transaction to ${fullAddress} for 100 XLM`;

    await client.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });

    // Should detect full address and recommend redaction
    const requests = client.getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].messages[0].content).toContain(fullAddress);

    // Assert that addresses should be redacted - should throw
    expect(() => {
      client.assertAddressesRedacted();
    }).toThrow('Un-redacted Stellar address');
  });

  it('should accept redacted addresses', async () => {
    const redactedAddress = 'GDSR...ASDFGH';
    const prompt = `Transaction to ${redactedAddress} for 100 XLM`;

    await client.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });

    // Should pass redaction check
    expect(() => {
      client.assertAddressesRedacted();
    }).not.toThrow();
  });

  it('should enforce token limits', async () => {
    // Create a very long prompt that exceeds default limit
    const longPrompt = 'This is a test. '.repeat(10000);

    // Should throw during createChatCompletion if prompt is too large
    await expect(async () => {
      await client.createChatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: longPrompt }],
      });
    }).rejects.toThrow('Prompt too large');
  });

  it('should return canned responses for risk levels', () => {
    const lowRiskResponse = createCannedResponse('low');
    expect(lowRiskResponse).toContain('transaction appears normal');
    expect(lowRiskResponse).not.toContain('highly unusual');

    const mediumRiskResponse = createCannedResponse('medium');
    expect(mediumRiskResponse).toContain('unusual');
    expect(mediumRiskResponse).toContain('Verification recommended');

    const highRiskResponse = createCannedResponse('high');
    expect(highRiskResponse).toContain('highly unusual');
    expect(highRiskResponse).toContain('Strong verification required');
  });

  it('should capture all requests for inspection', async () => {
    await client.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test message 1' }],
    });

    await client.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test message 2' }],
    });

    const requests = client.getRequests();
    expect(requests).toHaveLength(2);
    expect(requests[0].messages[0].content).toBe('Test message 1');
    expect(requests[1].messages[0].content).toBe('Test message 2');
  });

  it('should simulate OpenAI errors', async () => {
    client.setFailureMode('rate_limit');

    await expect(async () => {
      await client.createChatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
      });
    }).rejects.toThrow('Rate limit exceeded');
  });

  it('should validate response format', async () => {
    const response = await client.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Explain transaction' }],
    });

    expect(response).toHaveProperty('id');
    expect(response).toHaveProperty('choices');
    expect(response.choices).toHaveLength(1);
    expect(response.choices[0]).toHaveProperty('message');
    expect(response.choices[0].message).toHaveProperty('content');
    expect(response.choices[0].message).toHaveProperty('role', 'assistant');
  });

  it('should handle system messages', async () => {
    await client.createChatCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Explain risk.' },
      ],
    });

    const requests = client.getRequests();
    expect(requests[0].messages).toHaveLength(2);
    expect(requests[0].messages[0].role).toBe('system');
    expect(requests[0].messages[1].role).toBe('user');
  });

  it('should not cache responses', async () => {
    // Make same request twice
    await client.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Explain transaction' }],
    });

    await client.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Explain transaction' }],
    });

    // Should record both requests separately
    const requests = client.getRequests();
    expect(requests).toHaveLength(2);
  });

  it('should reset state between tests', async () => {
    await client.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test 1' }],
    });

    expect(client.getRequests()).toHaveLength(1);

    client.reset();

    expect(client.getRequests()).toHaveLength(0);
  });
});
