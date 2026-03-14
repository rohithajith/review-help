import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Keep legacy `jest.*` calls working after moving to Vitest.
globalThis.jest = vi;
