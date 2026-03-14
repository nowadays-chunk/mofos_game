import Phaser from 'phaser';

// Global Event Bus
export const gameEvents = new Phaser.Events.EventEmitter();

export const EVENTS = {
    PLAYER: {
        STATS_CHANGED: 'player-stats-changed',
        XP_GAINED: 'player-xp-gained'
    },
    COMBAT: {
        STARTED: 'combat-started',
        ENDED: 'combat-ended',
        UPDATED: 'combat-updated',
        TURN_CHANGED: 'combat-turn-changed',
        LOG: 'combat-log',
        SPELL_SELECTED: 'combat-spell-selected',
        ACTION_FAILED: 'combat-action-failed',
        END_TURN_REQUESTED: 'combat-end-turn-requested'
    },
    UI: {
        TOGGLE_WINDOW: 'ui-toggle-window'
    }
};
