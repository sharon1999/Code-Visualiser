import React from 'react';
import Editor from '@monaco-editor/react';
import { useAppSelector, useAppDispatch } from '../../hooks/storeHooks';
import { setCode } from '../../store/editorSlice';

const CodeEditor: React.FC = () => {
  const dispatch = useAppDispatch();
  const { code, language } = useAppSelector((state) => state.editor);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      dispatch(setCode(value));
    }
  };

  return (
    <div className="w-full h-full">
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          formatOnPaste: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
