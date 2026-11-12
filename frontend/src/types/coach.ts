/** Coach chat persistence, action proposals (confirm cards) and menu advice. */

/** Data areas an action can change; the app refetches these after it runs. */
export type CoachDomain =
  | 'nutrition'
  | 'dietPlan'
  | 'workouts'
  | 'recovery'
  | 'dashboard'
  | 'gamification';

export type ProposalStatus = 'pending' | 'executing' | 'done' | 'failed' | 'cancelled' | 'expired';

export type ProposalChange = {
  label: string;
  value: string;
};

/** An action the coach set up; nothing changes until the user confirms it. */
export type CoachProposal = {
  id: string;
  tool: string;
  title: string;
  summary: string;
  changes: ProposalChange[];
  /** True when the numbers include estimates (AI or restaurant food). */
  estimate: boolean;
  status: ProposalStatus;
  /** The backend's own account of what happened, once confirmed. */
  result_message: string | null;
  invalidates: CoachDomain[];
  created_at: string | null;
};

export type CoachMessageKind = 'text' | 'menu' | 'action_result';

/** A message as stored on the server. */
export type StoredCoachMessage = {
  id: string;
  role: 'user' | 'assistant';
  kind: CoachMessageKind;
  content: string;
  proposals: CoachProposal[];
  created_at: string;
};

export type CoachConversation = {
  conversation_id: string | null;
  messages: StoredCoachMessage[];
};

export type ConfirmActionResult = {
  proposal: CoachProposal;
  message: StoredCoachMessage;
  invalidate: CoachDomain[];
};

export type CancelActionResult = {
  proposal: CoachProposal;
};

export type MenuOption = {
  name: string;
  portion: string;
  why: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  estimate: boolean;
  fits: boolean;
};

export type MenuAdvice = {
  conversation_id: string;
  user_message: StoredCoachMessage;
  message: StoredCoachMessage;
  options: MenuOption[];
};

export type MenuAdviceRequest = {
  text: string;
  image: File | null;
};
