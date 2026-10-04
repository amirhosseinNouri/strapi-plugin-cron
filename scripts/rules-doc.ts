/** Renders the README rule table from the rule registry (see gen-rules-doc.ts). */
import { rules } from '../server/src/security/rules';

const START = '<!-- rules:start -->';
const END = '<!-- rules:end -->';

export const renderRulesTable = () => {
  const row = (rule: (typeof rules)[number]) =>
    `| \`${rule.id}\` | ${rule.severity === 'error' ? '⛔ error' : '⚠️ warning'} | ${rule.description} ${rule.rationale} |`;
  return [
    '| Rule | Severity | What it catches and why |',
    '| --- | --- | --- |',
    ...rules.filter((rule) => rule.severity === 'error').map(row),
    ...rules.filter((rule) => rule.severity === 'warning').map(row),
  ].join('\n');
};

export const updateReadme = (readme: string) => {
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start === -1 || end === -1) throw new Error('README is missing the rules markers');
  return `${readme.slice(0, start + START.length)}\n${renderRulesTable()}\n${readme.slice(end)}`;
};
