import { lintGutter } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React, { useEffect, useRef } from 'react';

/** The last EditorView created by the mock, for assertions. */
export const mockEditor: { view: EditorView | null; props: any } = { view: null, props: null };

/**
 * Lightweight stand-in for @uiw/react-codemirror: a textarea for interaction
 * plus a real (headless) EditorView so diagnostics/selection logic runs.
 */
const CodeMirror = (props: any) => {
  const viewRef = useRef<EditorView | null>(null);
  mockEditor.props = props;

  useEffect(() => {
    const parent = document.createElement('div');
    const view = new EditorView({
      state: EditorState.create({ doc: props.value ?? '', extensions: [lintGutter()] }),
      parent,
    });
    viewRef.current = view;
    mockEditor.view = view;
    props.onCreateEditor?.(view, view.state);
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== props.value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: props.value ?? '' } });
    }
  }, [props.value]);

  return (
    <textarea
      data-testid="codemirror"
      aria-label={props['aria-label']}
      data-theme={typeof props.theme === 'string' ? props.theme : 'custom'}
      readOnly={props.readOnly}
      value={props.value}
      onChange={(event) => props.onChange?.(event.target.value)}
    />
  );
};

export default CodeMirror;
