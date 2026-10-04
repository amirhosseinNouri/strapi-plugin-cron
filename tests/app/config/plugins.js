const path = require('path');

module.exports = () => ({
  'strapi-plugin-cron': {
    enabled: true,
    resolve: path.resolve(__dirname, '..', '..', '..'),
    config: {
      securityCheck: true,
      syntaxHighlighting: true,
    },
  },
});
