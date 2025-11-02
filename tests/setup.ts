import { config } from 'dotenv';
import path from 'path';

// Load test environment
config({ path: path.resolve(__dirname, '../.env.test') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests (optional)
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  };
}

// Freeze time for deterministic tests
export const FIXED_TIME = new Date('2024-03-15T14:30:00.000Z').getTime();

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
