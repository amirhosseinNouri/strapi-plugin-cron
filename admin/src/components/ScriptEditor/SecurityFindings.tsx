import { Badge, Box, Flex, Loader, TextButton, Typography } from '@strapi/design-system';
import type { SecurityCheckResult, SecurityFinding } from '../../../../types';

type Props = {
  result: SecurityCheckResult | null;
  isValidating?: boolean;
  onSelect?: (finding: SecurityFinding) => void;
};

export const SecurityFindings = ({ result, isValidating = false, onSelect }: Props) => {
  if (!result && !isValidating) return null;
  if (result && !result.enabled) return null;

  return (
    <Box data-testid="security-findings" aria-live="polite">
      <Flex gap={2} alignItems="center" paddingBottom={2}>
        <Typography variant="sigma" textColor="neutral600">
          Security check
        </Typography>
        {isValidating && <Loader small>Checking script…</Loader>}
        {result && !isValidating && result.findings.length === 0 && (
          <Badge backgroundColor="success100" textColor="success700">
            No issues found
          </Badge>
        )}
        {result && result.errors > 0 && (
          <Badge backgroundColor="danger100" textColor="danger700">
            {`${result.errors} error${result.errors === 1 ? '' : 's'}`}
          </Badge>
        )}
        {result && result.warnings > 0 && (
          <Badge backgroundColor="warning100" textColor="warning700">
            {`${result.warnings} warning${result.warnings === 1 ? '' : 's'}`}
          </Badge>
        )}
      </Flex>
      {result && result.findings.length > 0 && (
        <Box as="ul">
          {result.findings.map((finding, index) => (
            <Flex
              as="li"
              key={`${finding.ruleId}-${finding.line}-${finding.column}-${index}`}
              gap={2}
              paddingBottom={1}
              alignItems="flex-start"
            >
              <Badge
                backgroundColor={finding.severity === 'error' ? 'danger100' : 'warning100'}
                textColor={finding.severity === 'error' ? 'danger700' : 'warning700'}
              >
                {finding.severity}
              </Badge>
              <TextButton onClick={() => onSelect?.(finding)}>
                <Typography variant="pi" textColor="neutral800">
                  {`Line ${finding.line}:${finding.column} — ${finding.message}`}
                </Typography>
              </TextButton>
              <Typography variant="pi" textColor="neutral500">
                {finding.ruleId}
              </Typography>
            </Flex>
          ))}
        </Box>
      )}
    </Box>
  );
};
