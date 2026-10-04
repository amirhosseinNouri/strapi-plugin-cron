const path = require('path');

module.exports = () => ({
  connection: {
    client: 'sqlite',
    connection: {
      filename: process.env.TEST_DATABASE_FILENAME || path.join(__dirname, '..', '.tmp', 'test.db'),
    },
    useNullAsDefault: true,
  },
});
