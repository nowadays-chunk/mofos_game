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
        TURN_CHANGED: 'combat-turn-changed',
        LOG: 'combat-log',
        SPELL_SELECTED: 'combat-spell-selected'
    },
    UI: {
        TOGGLE_WINDOW: 'ui-toggle-window'
    }
};
