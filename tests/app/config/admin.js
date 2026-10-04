module.exports = () => ({
  serveAdminPanel: false,
  autoOpen: false,
  auth: { secret: 'test-admin-jwt-secret' },
  apiToken: { salt: 'test-api-token-salt' },
  transfer: { token: { salt: 'test-transfer-token-salt' } },
  secrets: { encryptionKey: 'test-encryption-key-0123456789abcdef' },
  rateLimit: { enabled: false },
});
