export interface EditorState {
  code: string;
  language: string;
  isRunning: boolean;
}

export type RootState = {
  editor: EditorState;
};
