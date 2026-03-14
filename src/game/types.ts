import { Spell } from './data/Courants';
import { OtherPlayer } from './entities/OtherPlayer';
import { Player } from './entities/Player';

export interface GridNode {
    x: number;
    y: number;
    walkable: boolean;
    obstacle?: boolean;
}

export interface GridPoint {
    x: number;
    y: number;
}

export type CombatEntity = Player | OtherPlayer;
export type BattleTeam = 'player' | 'enemy';
export type BattleLogType = 'system' | 'turn' | 'damage' | 'heal' | 'status' | 'victory';
export type StatusEffectKind = 'poison' | 'shield' | 'boost' | 'debuff' | 'state';
export type StatusEffectStat = 'ap' | 'mp' | 'range' | 'power' | 'shield';

export interface StatusEffectInstance {
    id: string;
    name: string;
    kind: StatusEffectKind;
    value: number;
    duration: number;
    sourceFighterId: string;
    stat?: StatusEffectStat;
    tick?: 'turnStart' | 'turnEnd';
    state?: string;
}

export interface BattleFighter {
    id: string;
    name: string;
    team: BattleTeam;
    entity: CombatEntity;
    spells: Spell[];
    initiative: number;
    hp: number;
    maxHp: number;
    ap: number;
    maxAp: number;
    mp: number;
    maxMp: number;
    rangeBonus: number;
    powerBonus: number;
    cooldowns: Record<string, number>;
    castsThisTurn: Record<string, number>;
    castsPerTargetThisTurn: Record<string, Record<string, number>>;
    statusEffects: StatusEffectInstance[];
    alive: boolean;
}

export interface BattleLogEntry {
    id: string;
    message: string;
    type: BattleLogType;
}

export interface BattleFighterSnapshot {
    id: string;
    name: string;
    team: BattleTeam;
    hp: number;
    maxHp: number;
    ap: number;
    maxAp: number;
    mp: number;
    maxMp: number;
    initiative: number;
    alive: boolean;
    position: GridPoint;
    cooldowns: Record<string, number>;
    statusEffects: StatusEffectInstance[];
}

export interface BattleSnapshot {
    isActive: boolean;
    activeFighterId: string | null;
    activeTeam: BattleTeam | null;
    turnNumber: number;
    remainingTurnSeconds: number;
    roundOrder: string[];
    fighters: BattleFighterSnapshot[];
    logs: BattleLogEntry[];
    winner: BattleTeam | null;
}

export interface BattleParticipantConfig {
    id: string;
    name: string;
    team: BattleTeam;
    entity: CombatEntity;
    spells: Spell[];
    initiative: number;
    startPosition: GridPoint;
    maxHp: number;
    maxAp: number;
    maxMp: number;
    hp?: number;
}

export interface BattlefieldQuery {
    isCellBlocked: (x: number, y: number, ignoreFighterIds?: string[]) => boolean;
    isCellInBounds: (x: number, y: number) => boolean;
}

export interface PathfindingOptions {
    allowDiagonals?: boolean;
    maxDistance?: number;
}
