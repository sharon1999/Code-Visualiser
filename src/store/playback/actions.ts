/**
 * Playback Actions — re-exports
 *
 * A thin re-export so components can do:
 *
 *   import { play, pause, next, goTo } from '@/store/playback/actions';
 *
 * instead of importing from the slice itself.  This decouples component imports
 * from the slice implementation file and makes future refactoring easier.
 */

export {
  loadSnapshots,
  next,
  previous,
  goTo,
  play,
  pause,
  stop,
  restart,
  setSpeed,
  clear,
} from "./playbackSlice";
