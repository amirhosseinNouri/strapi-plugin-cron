import { diagnosticCount } from '@codemirror/lint';
import { act, fireEvent, screen } from '@testing-library/react';
import React, { createRef, forwardRef, useState } from 'react';
import { ScriptEditor, type ScriptEditorHandle } from '../components/ScriptEditor';
import { isDarkColor } from '../components/ScriptEditor/theme';
import { stringOffset, toDiagnostic, toOffset } from '../components/ScriptEditor/positions';
import { mockEditor } from './mocks/react-codemirror';
import { errorResult, renderWithProviders, warningResult } from './render';

type ControlledProps = Partial<Omit<React.ComponentProps<typeof ScriptEditor>, 'ref'>> & { initial?: string };

const Controlled = forwardRef<ScriptEditorHandle, ControlledProps>(function Controlled({ initial, ...props }, ref) {
  const [value, setValue] = useState(initial ?? 'console.log(1)');
  return <ScriptEditor ref={ref} highlight value={value} onChange={setValue} {...props} />;
});

describe('ScriptEditor', () => {
  it('renders the code editor when highlighting is enabled', () => {
    renderWithProviders(<Controlled />);
    expect(screen.getByTestId('codemirror')).toHaveValue('console.log(1)');
    expect(screen.queryByTestId('script-textarea')).not.toBeInTheDocument();
  });

  it('follows the admin theme', () => {
    renderWithProviders(<Controlled />, { dark: true });
    expect(screen.getByTestId('codemirror')).toHaveAttribute('data-theme', 'dark');
  });

  it('uses a light editor in the light theme', () => {
    renderWithProviders(<Controlled />);
    expect(screen.getByTestId('codemirror')).toHaveAttribute('data-theme', 'light');
  });

  it('renders a textarea fallback when highlighting is disabled', () => {
    renderWithProviders(<Controlled highlight={false} />);
    expect(screen.queryByTestId('codemirror')).not.toBeInTheDocument();
    const textarea = screen.getByRole('textbox', { name: 'Script' });
    fireEvent.change(textarea, { target: { value: 'changed' } });
    expect(textarea).toHaveValue('changed');
  });

  it('propagates edits from the code editor', () => {
    renderWithProviders(<Controlled />);
    fireEvent.change(screen.getByTestId('codemirror'), { target: { value: 'next' } });
    expect(screen.getByTestId('codemirror')).toHaveValue('next');
  });

  it('works without an onChange handler', () => {
    renderWithProviders(<ScriptEditor highlight value="x" readOnly />);
    fireEvent.change(screen.getByTestId('codemirror'), { target: { value: 'y' } });
    renderWithProviders(<ScriptEditor highlight={false} value="x" />);
    fireEvent.change(screen.getAllByRole('textbox').at(-1)!, { target: { value: 'y' } });
  });

  it('opens and closes full screen with the button and Escape', () => {
    renderWithProviders(<Controlled footer={<div>Footer content</div>} />);
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    const dialog = screen.getByRole('dialog', { name: 'Script (full screen)' });
    expect(dialog).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByText('Footer content')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'a' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('supports full screen for the textarea fallback without footer', () => {
    renderWithProviders(<Controlled highlight={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Script' })).toBeInTheDocument();
  });

  it('shows findings as lint diagnostics', () => {
    renderWithProviders(<Controlled findings={errorResult.findings as any} />);
    expect(diagnosticCount(mockEditor.view!.state)).toBe(1);
  });

  it('updates diagnostics when findings change', () => {
    const { rerender } = renderWithProviders(<ScriptEditor highlight value="process" findings={[]} />);
    expect(diagnosticCount(mockEditor.view!.state)).toBe(0);
    rerender(<ScriptEditor highlight value="process" findings={warningResult.findings as any} />);
    expect(diagnosticCount(mockEditor.view!.state)).toBe(1);
  });

  it('moves the cursor to a finding in the code editor', () => {
    const ref = createRef<ScriptEditorHandle>();
    renderWithProviders(<Controlled ref={ref} initial={'line one\nline two'} />);
    act(() => ref.current!.focusAt(2, 3));
    expect(mockEditor.view!.state.selection.main.head).toBe(11);
  });

  it('moves the cursor to a finding in the textarea', () => {
    const ref = createRef<ScriptEditorHandle>();
    renderWithProviders(<Controlled ref={ref} highlight={false} initial={'ab\ncd'} />);
    act(() => ref.current!.focusAt(2, 2));
    const textarea = screen.getByRole('textbox', { name: 'Script' }) as HTMLTextAreaElement;
    expect(textarea.selectionStart).toBe(4);
    expect(document.activeElement).toBe(textarea);
  });
});

describe('editor helpers', () => {
  const doc = {
    lines: 2,
    length: 11,
    line: (n: number) => (n === 1 ? { from: 0, to: 5 } : { from: 6, to: 11 }),
  };

  it('clamps offsets to the document', () => {
    expect(toOffset(doc, 1, 1)).toBe(0);
    expect(toOffset(doc, 2, 3)).toBe(8);
    expect(toOffset(doc, 9, 99)).toBe(11);
    expect(toOffset(doc, 0, 0)).toBe(0);
  });

  it('creates non-empty diagnostic ranges', () => {
    const finding: any = { ruleId: 'r', severity: 'error', message: 'm', line: 1, column: 2, endLine: 1, endColumn: 2 };
    expect(toDiagnostic(doc, finding)).toEqual({ from: 1, to: 2, severity: 'error', message: 'm', source: 'r' });
    expect(toDiagnostic(doc, { ...finding, endColumn: 4 }).to).toBe(3);
  });

  it('computes textarea offsets', () => {
    expect(stringOffset('ab\ncd', 2, 2)).toBe(4);
    expect(stringOffset('ab\ncd', 5, 99)).toBe(5);
    expect(stringOffset('ab', 0, 0)).toBe(0);
  });

  it('detects dark colours', () => {
    expect(isDarkColor('#212134')).toBe(true);
    expect(isDarkColor('#ffffff')).toBe(false);
    expect(isDarkColor('#000')).toBe(true);
    expect(isDarkColor('rgb(0,0,0)')).toBe(false);
    expect(isDarkColor(undefined)).toBe(false);
  });
});
