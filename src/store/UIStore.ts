import { create } from 'zustand';

export interface WindowState {
    id: string;
    title?: string;
    isOpen: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    minimized?: boolean;
}

interface UIState {
    windows: Record<string, WindowState>;
    activeWindowId: string | null;
    highestZIndex: number;

    // Actions
    openWindow: (id: string, config?: Partial<WindowState>) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    moveWindow: (id: string, x: number, y: number) => void;
    resizeWindow: (id: string, width: number, height: number) => void;
    toggleWindow: (id: string) => void;
}

const DEFAULT_WINDOW_CONFIG: Partial<WindowState> = {
    x: 100,
    y: 100,
    width: 300,
    height: 400,
    isOpen: true,
    zIndex: 10 // Base z-index for windows
};

export const useUIStore = create<UIState>((set, get) => ({
    windows: {
        // Pre-define some windows with default states if needed
        'inventory': { ...DEFAULT_WINDOW_CONFIG, id: 'inventory', title: 'Inventory', x: 100, y: 100, width: 340, height: 400, isOpen: false, zIndex: 10 } as WindowState,
        'character': { ...DEFAULT_WINDOW_CONFIG, id: 'character', title: 'Character', x: 150, y: 150, isOpen: false, zIndex: 11 } as WindowState,
        'spells': { ...DEFAULT_WINDOW_CONFIG, id: 'spells', title: 'Spells', x: 200, y: 200, isOpen: false, zIndex: 12 } as WindowState,
        'chat': { ...DEFAULT_WINDOW_CONFIG, id: 'chat', title: 'Chat', x: 20, y: window.innerHeight - 320, width: 400, height: 250, isOpen: true, zIndex: 10 } as WindowState,
    },
    activeWindowId: null,
    highestZIndex: 100, // Start high enough to be above world/widgets

    openWindow: (id, config) => {
        set((state) => {
            const existing = state.windows[id];
            const newZ = state.highestZIndex + 1;

            return {
                windows: {
                    ...state.windows,
                    [id]: {
                        ...(existing || { ...DEFAULT_WINDOW_CONFIG, id }),
                        ...config,
                        isOpen: true,
                        zIndex: newZ
                    }
                },
                activeWindowId: id,
                highestZIndex: newZ
            };
        });
    },

    closeWindow: (id) => {
        set((state) => ({
            windows: {
                ...state.windows,
                [id]: {
                    ...state.windows[id],
                    isOpen: false
                }
            }
        }));
    },

    toggleWindow: (id) => {
        const state = get();
        if (state.windows[id]?.isOpen) {
            state.closeWindow(id);
        } else {
            state.openWindow(id);
        }
    },

    focusWindow: (id) => {
        set((state) => {
            // If already top, do nothing (optimization)
            if (state.activeWindowId === id && state.windows[id].zIndex === state.highestZIndex) {
                return state;
            }

            const newZ = state.highestZIndex + 1;
            return {
                windows: {
                    ...state.windows,
                    [id]: {
                        ...state.windows[id],
                        zIndex: newZ
                    }
                },
                activeWindowId: id,
                highestZIndex: newZ
            };
        });
    },

    moveWindow: (id, x, y) => {
        set((state) => ({
            windows: {
                ...state.windows,
                [id]: {
                    ...state.windows[id],
                    x,
                    y
                }
            }
        }));
    },

    resizeWindow: (id, width, height) => {
        set((state) => ({
            windows: {
                ...state.windows,
                [id]: {
                    ...state.windows[id],
                    width,
                    height
                }
            }
        }));
    }
}));
