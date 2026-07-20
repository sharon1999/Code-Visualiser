import { configureStore } from '@reduxjs/toolkit';
import editorReducer from './editorSlice';
import playbackReducer from './playback/playbackSlice';

export const store = configureStore({
  reducer: {
    editor: editorReducer,
    playback: playbackReducer,
  },
  // Disable the serializable-check middleware for snapshots because they
  // can contain large Babel AST objects that would flood the console.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredPaths: ['playback.snapshots', 'editor.ast'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
