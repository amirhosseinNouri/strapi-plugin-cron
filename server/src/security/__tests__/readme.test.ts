import fs from 'fs';
import path from 'path';
import { updateReadme } from '../../../../scripts/rules-doc';

describe('README rule table', () => {
  const file = path.resolve(__dirname, '..', '..', '..', '..', 'README.md');

  it('is in sync with the rule registry (run `npm run docs:rules`)', () => {
    const readme = fs.readFileSync(file, 'utf8');
    expect(updateReadme(readme)).toBe(readme);
  });

  it('fails loudly when the markers are missing', () => {
    expect(() => updateReadme('no markers')).toThrow(/markers/);
  });
});
