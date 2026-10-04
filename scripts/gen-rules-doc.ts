/**
 * Regenerates the "Writing safe scripts" rule table in README.md from the rule
 * registry, so documentation never drifts from what the check enforces.
 *   npm run docs:rules
 */
import fs from 'fs';
import path from 'path';
import { updateReadme } from './rules-doc';

const file = path.resolve(__dirname, '..', 'README.md');
fs.writeFileSync(file, updateReadme(fs.readFileSync(file, 'utf8')));
console.log('README rules table updated');
