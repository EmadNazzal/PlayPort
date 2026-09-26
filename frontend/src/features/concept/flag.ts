import { create } from 'zustand';

const KEY = 'playport-concept';

/** Concept screens are on when the tab was opened with ?concept=1. */
export const isConcept = (): boolean => {
  try {
    if (new URLSearchParams(location.search).get('concept') === '1') sessionStorage.setItem(KEY, '1');
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

/** Cross-screen state for the staged match, updated by the user and by the director script. */
type ConceptState = {
  hostLocked: boolean;
  guestLocked: boolean;
  launching: boolean;
  set: (patch: Partial<Omit<ConceptState, 'set'>>) => void;
};

export const useConcept = create<ConceptState>((set) => ({ hostLocked: false, guestLocked: false, launching: false, set }));
