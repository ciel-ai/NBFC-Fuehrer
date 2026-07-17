// tests/fixtures/setup.ts
//
// Runs once, after the Jest test environment is set up, before each test
// file. Currently a placeholder — today's tests (emi.calculator) are pure
// functions with no DB/Redis/env dependency, so nothing is needed yet.
//
// This file previously did not exist at all, despite being referenced by
// jest.config.ts — meaning the test suite could never actually run. Add
// real setup here (test DB connection, env var stubs, etc.) as integration
// tests are introduced.

export {};