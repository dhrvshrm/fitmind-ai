import type { BodyArea } from './bodyDiagram';
import type { MuscleGroup } from '../types/exercise';

/** Exercise-data muscle groups -> areas on the body diagram. */
export const MUSCLE_AREAS: Record<MuscleGroup, BodyArea[]> = {
  abdominals: ['abs', 'obliques'],
  abductors: ['abductors'],
  adductors: ['adductor'],
  biceps: ['biceps'],
  calves: ['calves', 'left-soleus', 'right-soleus'],
  chest: ['chest'],
  forearms: ['forearm'],
  glutes: ['gluteal'],
  hamstrings: ['hamstring'],
  lats: ['upper-back'],
  'lower back': ['lower-back'],
  'middle back': ['upper-back'],
  neck: ['neck'],
  quadriceps: ['quadriceps'],
  shoulders: ['front-deltoids', 'back-deltoids'],
  traps: ['trapezius'],
  triceps: ['triceps'],
};

export const MUSCLE_GROUPS = Object.keys(MUSCLE_AREAS) as MuscleGroup[];

/** Parts of the outline that aren't muscles (no hover label). */
export const NON_MUSCLE_AREAS: ReadonlySet<BodyArea> = new Set<BodyArea>(['head', 'knees']);

/** How long each demonstration photo shows before switching (start <-> end position). */
export const DEMO_FRAME_MS = 1100;
