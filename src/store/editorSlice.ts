import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { EditorState } from '../types';

const initialState: EditorState = {
  code: '// Welcome to the DSA Code Visualizer\nfunction twoSum(nums, target) {\n  \n}',
  language: 'javascript',
  isRunning: false,
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setCode: (state, action: PayloadAction<string>) => {
      state.code = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setIsRunning: (state, action: PayloadAction<boolean>) => {
      state.isRunning = action.payload;
    },
    resetCode: (state) => {
      state.code = initialState.code;
      state.isRunning = false;
    },
  },
});

export const { setCode, setLanguage, setIsRunning, resetCode } = editorSlice.actions;

export default editorSlice.reducer;
