import React, { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';
import { Spell } from '../game/data/Courants';
import { gameEvents, EVENTS } from '../game/GameEventBus';
import { BattleSnapshot } from '../game/types';

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
    initiative: number;
    spells: Spell[];
    statuses: string[];
}

export interface GameState {
    player: PlayerStats;
    combat: BattleSnapshot;
    selectedSpellId: string | null;
    combatError: string | null;
}

const EMPTY_COMBAT_STATE: BattleSnapshot = {
    isActive: false,
    activeFighterId: null,
    activeTeam: null,
    turnNumber: 0,
    remainingTurnSeconds: 0,
    roundOrder: [],
    fighters: [],
    logs: [],
    winner: null
};

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
        initiative: 18,
        spells: [],
        statuses: []
    },
    combat: EMPTY_COMBAT_STATE,
    selectedSpellId: null,
    combatError: null
};

type Action =
    | { type: 'UPDATE_PLAYER_STATS'; payload: Partial<PlayerStats> }
    | { type: 'SET_COMBAT_STATE'; payload: BattleSnapshot }
    | { type: 'SET_SELECTED_SPELL'; payload: string | null }
    | { type: 'SET_COMBAT_ERROR'; payload: string | null };

function gameReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'UPDATE_PLAYER_STATS':
            return { ...state, player: { ...state.player, ...action.payload } };
        case 'SET_COMBAT_STATE':
            return { ...state, combat: action.payload, combatError: null };
        case 'SET_SELECTED_SPELL':
            return { ...state, selectedSpellId: action.payload };
        case 'SET_COMBAT_ERROR':
            return { ...state, combatError: action.payload };
        default:
            return state;
    }
}

const GameStateContext = createContext<GameState>(initialState);
const GameDispatchContext = createContext<React.Dispatch<Action>>(() => undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    useEffect(() => {
        const onPlayerStatsChanged = (stats: Partial<PlayerStats>) => {
            dispatch({ type: 'UPDATE_PLAYER_STATS', payload: stats });
        };

        const onCombatStateChanged = (combat: BattleSnapshot) => {
            dispatch({ type: 'SET_COMBAT_STATE', payload: combat });
        };
        const onSpellSelected = (spellId: string | null) => {
            dispatch({ type: 'SET_SELECTED_SPELL', payload: spellId });
        };
        const onCombatActionFailed = (reason: string) => {
            dispatch({ type: 'SET_COMBAT_ERROR', payload: reason });
        };

        gameEvents.on(EVENTS.PLAYER.STATS_CHANGED, onPlayerStatsChanged);
        gameEvents.on(EVENTS.COMBAT.STARTED, onCombatStateChanged);
        gameEvents.on(EVENTS.COMBAT.UPDATED, onCombatStateChanged);
        gameEvents.on(EVENTS.COMBAT.ENDED, onCombatStateChanged);
        gameEvents.on(EVENTS.COMBAT.SPELL_SELECTED, onSpellSelected);
        gameEvents.on(EVENTS.COMBAT.ACTION_FAILED, onCombatActionFailed);

        return () => {
            gameEvents.off(EVENTS.PLAYER.STATS_CHANGED, onPlayerStatsChanged);
            gameEvents.off(EVENTS.COMBAT.STARTED, onCombatStateChanged);
            gameEvents.off(EVENTS.COMBAT.UPDATED, onCombatStateChanged);
            gameEvents.off(EVENTS.COMBAT.ENDED, onCombatStateChanged);
            gameEvents.off(EVENTS.COMBAT.SPELL_SELECTED, onSpellSelected);
            gameEvents.off(EVENTS.COMBAT.ACTION_FAILED, onCombatActionFailed);
        };
    }, []);

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
