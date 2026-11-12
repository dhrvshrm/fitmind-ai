import type { ProposalStatus } from '../types/coach';

/** Copy for the action-taking coach (confirm cards, chat history, menu advice). */
export const COACH_STRINGS = {
  quickPrompts: [
    'How much protein do I have left today?',
    'I drank 500 ml of water',
    'I only have 15 minutes at home today',
    'Give me a different lunch in my plan',
  ],
  header: {
    newChat: 'New chat',
    clearHistory: 'Clear history',
    menu: 'What should I order?',
  },
  history: {
    loadError: "Couldn't load your earlier messages.",
    clearTitle: 'Clear coach history?',
    clearBody: "This deletes every coach conversation and any cards you haven't confirmed. It can't be undone.",
    clearConfirm: 'Clear history',
    cleared: 'Coach history cleared',
    newChatError: "Couldn't start a new chat. Try again.",
    clearError: "Couldn't clear your history. Try again.",
  },
  action: {
    confirm: 'Confirm',
    dismiss: 'Dismiss',
    estimate: 'Estimate',
    confirmError: "That didn't go through. Try again.",
    cancelError: "Couldn't dismiss that card. Try again.",
    status: {
      pending: 'Waiting for you',
      executing: 'Working on it',
      done: 'Done',
      failed: 'Failed',
      cancelled: 'Dismissed',
      expired: 'Expired',
    } satisfies Record<ProposalStatus, string>,
  },
  menu: {
    title: 'What should I order?',
    description:
      'Paste or type the menu, or add a photo of it. You get the best 2 or 3 picks for the calories and protein you have left today.',
    textLabel: 'Menu',
    textPlaceholder: 'Paneer tikka 320\nDal tadka 220\nTandoori roti 30',
    addPhoto: 'Add menu photo',
    removePhoto: 'Remove photo',
    submit: 'Suggest picks',
    cancel: 'Cancel',
    emptyError: 'Paste the menu or add a photo first.',
    error: "Couldn't read that menu. Try pasting the dish names.",
    photoTooLarge: 'That photo is too large (6 MB max).',
  },
} as const;

/** Largest menu photo the backend accepts. */
export const MAX_MENU_PHOTO_BYTES = 6 * 1024 * 1024;
