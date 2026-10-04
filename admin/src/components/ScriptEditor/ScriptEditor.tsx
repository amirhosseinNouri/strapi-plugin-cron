import { Box, Flex, IconButton, Textarea, Typography } from '@strapi/design-system';
import { Collapse, Expand } from '@strapi/icons';
import { javascript } from '@codemirror/lang-javascript';
import { lintGutter, setDiagnostics } from '@codemirror/lint';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'styled-components';
import type { SecurityFinding } from '../../../../types';
import { stringOffset, toDiagnostic, toOffset } from './positions';
import { isDarkColor } from './theme';

export type ScriptEditorHandle = {
  /** Moves the cursor to a 1-based line/column and focuses the editor. */
  focusAt: (line: number, column: number) => void;
};

type Props = {
  name?: string;
  label?: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  /** When false, a plain textarea is rendered instead of the code editor. */
  highlight: boolean;
  findings?: SecurityFinding[];
  minHeight?: string;
  /** Rendered under the editor, also in full screen (e.g. security findings). */
  footer?: React.ReactNode;
};

const monospace = `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace`;

export const ScriptEditor = forwardRef<ScriptEditorHandle, Props>(function ScriptEditor(
  {
    name = 'script',
    label = 'Script',
    value,
    onChange,
    readOnly = false,
    highlight,
    findings = [],
    minHeight = '240px',
    footer,
  },
  ref
) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewRef = useRef<EditorView | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const theme: any = useTheme();
  const dark = isDarkColor(theme?.colors?.neutral0);

  const extensions = useMemo(
    () => [javascript(), lintGutter(), EditorView.lineWrapping],
    []
  );

  // Push server-side findings into the editor as lint diagnostics.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const diagnostics = findings.map((finding) => toDiagnostic(view.state.doc, finding));
    view.dispatch(setDiagnostics(view.state, diagnostics));
  }, [findings, highlight, isFullscreen, value]);

  // Esc leaves full screen; body scroll is locked while open.
  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  const focusAt = useCallback(
    (line: number, column: number) => {
      const view = viewRef.current;
      if (highlight && view) {
        const offset = toOffset(view.state.doc, line, column);
        view.dispatch({
          selection: EditorSelection.cursor(offset),
          effects: EditorView.scrollIntoView(offset, { y: 'center' }),
        });
        view.focus();
        return;
      }
      const textarea = textareaRef.current;
      if (textarea) {
        const offset = stringOffset(value, line, column);
        textarea.focus();
        textarea.setSelectionRange(offset, offset);
      }
    },
    [highlight, value]
  );

  useImperativeHandle(ref, () => ({ focusAt }), [focusAt]);

  const toggleLabel = isFullscreen ? 'Exit full screen' : 'Full screen';

  const editor = highlight ? (
    <Box
      data-testid="script-code-editor"
      borderColor="neutral200"
      borderStyle="solid"
      borderWidth="1px"
      hasRadius
      overflow="hidden"
      style={{ flex: isFullscreen ? 1 : undefined, minHeight: 0 }}
    >
      <CodeMirror
        value={value}
        onChange={(next) => onChange?.(next)}
        readOnly={readOnly}
        editable={!readOnly}
        theme={dark ? 'dark' : 'light'}
        extensions={extensions}
        height={isFullscreen ? '100%' : undefined}
        minHeight={isFullscreen ? undefined : minHeight}
        maxHeight={isFullscreen ? undefined : '600px'}
        style={{ height: isFullscreen ? '100%' : undefined, fontSize: 13 }}
        aria-label={label}
        onCreateEditor={(view) => {
          viewRef.current = view;
          view.dispatch(
            setDiagnostics(
              view.state,
              findings.map((finding) => toDiagnostic(view.state.doc, finding))
            )
          );
        }}
        basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: !readOnly }}
      />
    </Box>
  ) : (
    <Textarea
      ref={textareaRef}
      data-testid="script-textarea"
      name={name}
      aria-label={label}
      value={value}
      disabled={readOnly}
      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(event.target.value)}
      style={{
        fontFamily: monospace,
        fontSize: 13,
        minHeight: isFullscreen ? undefined : minHeight,
        height: isFullscreen ? '100%' : undefined,
        resize: isFullscreen ? 'none' : 'vertical',
      }}
    />
  );

  const toolbar = (
    <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
      <Typography variant={isFullscreen ? 'beta' : 'pi'} fontWeight="bold">
        {isFullscreen ? label : ''}
      </Typography>
      <IconButton
        label={toggleLabel}
        onClick={() => setIsFullscreen((open) => !open)}
        variant="tertiary"
        size="S"
      >
        {isFullscreen ? <Collapse /> : <Expand />}
      </IconButton>
    </Flex>
  );

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  };

  if (isFullscreen) {
    return createPortal(
      <Box
        role="dialog"
        aria-modal="true"
        aria-label={`${label} (full screen)`}
        background="neutral0"
        padding={6}
        style={overlayStyle}
      >
        {toolbar}
        <Flex direction="column" alignItems="stretch" style={{ flex: 1, minHeight: 0 }}>
          {editor}
        </Flex>
        {footer && (
          <Box paddingTop={4} style={{ maxHeight: '30vh', overflow: 'auto' }}>
            {footer}
          </Box>
        )}
      </Box>,
      document.body
    );
  }

  return (
    <Box>
      {toolbar}
      {editor}
      {footer && <Box paddingTop={3}>{footer}</Box>}
    </Box>
  );
});
