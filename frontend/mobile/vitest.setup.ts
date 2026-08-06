// Env values consumed by src/core/config/env.ts at import time. Set before
// any module import so the schema parses cleanly (no dev-fallback noise).
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
process.env.EXPO_PUBLIC_USE_MOCK = 'true';
process.env.NODE_ENV = 'test';
