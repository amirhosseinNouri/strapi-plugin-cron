import { fireEvent, screen } from '@testing-library/react';
import { SecurityFindings } from '../components/ScriptEditor';
import { cleanResult, errorResult, renderWithProviders, warningResult } from './render';

describe('SecurityFindings', () => {
  it('renders nothing without a result or when the check is disabled', () => {
    renderWithProviders(<SecurityFindings result={null} />);
    expect(screen.queryByTestId('security-findings')).not.toBeInTheDocument();
    renderWithProviders(<SecurityFindings result={{ ...cleanResult, enabled: false }} />);
    expect(screen.queryByTestId('security-findings')).not.toBeInTheDocument();
  });

  it('shows a loader while validating', () => {
    renderWithProviders(<SecurityFindings result={null} isValidating />);
    expect(screen.getByText('Checking script…')).toBeInTheDocument();
  });

  it('shows a clean state', () => {
    renderWithProviders(<SecurityFindings result={cleanResult} />);
    expect(screen.getByText('No issues found')).toBeInTheDocument();
  });

  it('lists errors and warnings with counts and lets users jump to them', () => {
    const onSelect = jest.fn();
    const result: any = {
      ...errorResult,
      errors: 2,
      warnings: 2,
      findings: [...errorResult.findings, ...errorResult.findings, ...warningResult.findings, ...warningResult.findings],
    };
    renderWithProviders(<SecurityFindings result={result} onSelect={onSelect} />);
    expect(screen.getByText('2 errors')).toBeInTheDocument();
    expect(screen.getByText('2 warnings')).toBeInTheDocument();
    fireEvent.click(screen.getAllByText(/Line 1:1 — Accessing process/)[0]);
    expect(onSelect).toHaveBeenCalledWith(errorResult.findings[0]);
  });

  it('uses singular labels and tolerates a missing onSelect', () => {
    renderWithProviders(<SecurityFindings result={errorResult as any} />);
    expect(screen.getByText('1 error')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Accessing process/));
    renderWithProviders(<SecurityFindings result={warningResult as any} />);
    expect(screen.getByText('1 warning')).toBeInTheDocument();
  });
});
