// Ensure crypto.randomUUID is available globally
if (typeof globalThis.crypto === 'undefined') {
  const crypto = require('crypto');
  if (typeof crypto.randomUUID === 'function') {
    globalThis.crypto = crypto as any;
  }
}

