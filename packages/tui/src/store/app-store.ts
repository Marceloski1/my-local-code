import { create } from 'zustand';

export interface AppStore {
  activeScreen: 'models' | 'chat' | 'sessions';
  activeModel: string | null;
  mode: 'plan' | 'build';
  activeSessionId: string | null;
  serverConnected: boolean;

  setScreen: (screen: AppStore['activeScreen']) => void;
  setModel: (model: string | null) => void;
  setMode: (mode: AppStore['mode']) => void;
  setSession: (id: string | null) => void;
  setServerConnected: (connected: boolean) => void;
}

export const useAppStore = create<AppStore>(set => ({
  activeScreen: 'models',
  activeModel: null,
  mode: 'plan',
  activeSessionId: null,
  serverConnected: false,

  setScreen: screen => set({ activeScreen: screen }),
  setModel: model => set({ activeModel: model }),
  setMode: mode => set({ mode }),
  setSession: id => set({ activeSessionId: id }),
  setServerConnected: connected => set({ serverConnected: connected }),
}));
