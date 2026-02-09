import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { gameEvents, EVENTS } from '../game/GameEventBus';
import { Spell } from '../game/data/Courants';

// --- State Definitions ---

export interface PlayerStats {
    hp: number;
    maxHp: number;
    ap: number;
    maxAp: number;
    mp: number;
    maxMp: number;
    name: string;
    level: number;
    xp: number;
    maXp: number;
    spells: Spell[];
}

export interface GameState {
    player: PlayerStats;
    combat: {
        isActive: boolean;
        turn: 'player' | 'opponent' | null;
        logs: string[];
    };
}

// --- Initial State ---

const initialState: GameState = {
    player: {
        hp: 100,
        maxHp: 100,
        ap: 6,
        maxAp: 6,
        mp: 3,
        maxMp: 3,
        name: 'Player',
        level: 1,
        xp: 0,
        maXp: 1000,
        spells: []
    },
    combat: {
        isActive: false,
        turn: null,
        logs: []
    }
};

// --- Actions ---

type Action =
    | { type: 'UPDATE_PLAYER_STATS'; payload: Partial<PlayerStats> }
    | { type: 'SET_COMBAT_STATE'; payload: { isActive: boolean; turn: 'player' | 'opponent' | null } }
    | { type: 'ADD_COMBAT_LOG'; payload: string };

// --- Reducer ---

function gameReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'UPDATE_PLAYER_STATS':
            return { ...state, player: { ...state.player, ...action.payload } };
        case 'SET_COMBAT_STATE':
            return {
                ...state,
                combat: { ...state.combat, isActive: action.payload.isActive, turn: action.payload.turn }
            };
        case 'ADD_COMBAT_LOG':
            return {
                ...state,
                combat: { ...state.combat, logs: [...state.combat.logs, action.payload] }
            };
        default:
            return state;
    }
}

// --- Context ---

const GameStateContext = createContext<GameState>(initialState);
const GameDispatchContext = createContext<React.Dispatch<Action>>(() => null);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    useEffect(() => {
        // Event Handlers
        const onPlayerStatsChanged = (stats: Partial<PlayerStats>) => {
            dispatch({ type: 'UPDATE_PLAYER_STATS', payload: stats });
        };

        const onCombatStarted = (data: any) => {
            dispatch({
                type: 'SET_COMBAT_STATE',
                payload: { isActive: true, turn: data.currentTurn }
            });
        };

        const onCombatEnded = () => {
            dispatch({
                type: 'SET_COMBAT_STATE',
                payload: { isActive: false, turn: null }
            });
        };

        const onTurnChanged = (turn: 'player' | 'opponent') => {
            dispatch({
                type: 'SET_COMBAT_STATE',
                payload: { isActive: true, turn }
            });
        };

        const onCombatLog = (message: string) => {
            dispatch({ type: 'ADD_COMBAT_LOG', payload: message });
        };

        // Subscriptions
        gameEvents.on(EVENTS.PLAYER.STATS_CHANGED, onPlayerStatsChanged);
        gameEvents.on(EVENTS.COMBAT.STARTED, onCombatStarted);
        gameEvents.on(EVENTS.COMBAT.ENDED, onCombatEnded);
        gameEvents.on(EVENTS.COMBAT.TURN_CHANGED, onTurnChanged);
        gameEvents.on(EVENTS.COMBAT.LOG, onCombatLog);

        return () => {
            // Cleanup
            gameEvents.off(EVENTS.PLAYER.STATS_CHANGED, onPlayerStatsChanged);
            gameEvents.off(EVENTS.COMBAT.STARTED, onCombatStarted);
            gameEvents.off(EVENTS.COMBAT.ENDED, onCombatEnded);
            gameEvents.off(EVENTS.COMBAT.TURN_CHANGED, onTurnChanged);
            gameEvents.off(EVENTS.COMBAT.LOG, onCombatLog);
        };
    }, []); // Empty dependency array to run once

    return (
        <GameStateContext.Provider value={state}>
            <GameDispatchContext.Provider value={dispatch}>
                {children}
            </GameDispatchContext.Provider>
        </GameStateContext.Provider>
    );
};

export const useGameState = () => useContext(GameStateContext);
export const useGameDispatch = () => useContext(GameDispatchContext);
