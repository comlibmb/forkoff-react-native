import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TutorialState {
  hasCompletedTutorial: boolean;
  isTutorialActive: boolean;
  currentStep: number;

  startTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
}

const TOTAL_STEPS = 7;

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      hasCompletedTutorial: false,
      isTutorialActive: false,
      currentStep: 0,

      startTutorial: () => {
        set({ isTutorialActive: true, currentStep: 0 });
      },

      nextStep: () => {
        const { currentStep } = get();
        if (currentStep >= TOTAL_STEPS - 1) {
          get().completeTutorial();
        } else {
          set({ currentStep: currentStep + 1 });
        }
      },

      skipTutorial: () => {
        set({ isTutorialActive: false, hasCompletedTutorial: true, currentStep: 0 });
      },

      completeTutorial: () => {
        set({ isTutorialActive: false, hasCompletedTutorial: true, currentStep: 0 });
      },

      resetTutorial: () => {
        set({ hasCompletedTutorial: false, currentStep: 0 });
      },
    }),
    {
      name: 'tutorial-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedTutorial: state.hasCompletedTutorial,
      }),
    }
  )
);

export default useTutorialStore;
