import Phaser from 'phaser';
import { Spell, SpellEffect, SpellEffectType } from '../data/Courants';
import { gameEvents, EVENTS } from '../GameEventBus';
import {
    BattlefieldQuery,
    BattleFighter,
    BattleFighterSnapshot,
    BattleLogEntry,
    BattleParticipantConfig,
    BattleSnapshot,
    BattleTeam,
    GridPoint,
    StatusEffectInstance,
    StatusEffectStat
} from '../types';
import { Pathfinding } from './Pathfinding';

const TURN_TIME_LIMIT_SECONDS = 20;
const MAX_LOG_ENTRIES = 30;

export class CombatSystem {
    private scene: Phaser.Scene;
    private battlefield: BattlefieldQuery;
    private fighters = new Map<string, BattleFighter>();
    private turnOrder: string[] = [];
    private turnOrderIndex = 0;
    private turnTimer: Phaser.Time.TimerEvent | null = null;
    private logs: BattleLogEntry[] = [];
    private turnNumber = 0;
    private remainingTurnSeconds = 0;
    private winner: BattleTeam | null = null;
    isActive = false;

    constructor(scene: Phaser.Scene, battlefield: BattlefieldQuery) {
        this.scene = scene;
        this.battlefield = battlefield;
    }

    startCombat(participants: BattleParticipantConfig[]) {
        this.stopTurnTimer();
        this.fighters.clear();
        this.logs = [];
        this.winner = null;
        this.turnNumber = 1;
        this.isActive = true;

        participants.forEach((participant) => {
            participant.entity.setGridPosition(participant.startPosition.x, participant.startPosition.y);
            const cooldowns = participant.spells.reduce<Record<string, number>>((carry, spell) => {
                carry[spell.id] = spell.constraints.initialCooldown ?? 0;
                return carry;
            }, {});

            const fighter: BattleFighter = {
                id: participant.id,
                name: participant.name,
                team: participant.team,
                entity: participant.entity,
                spells: participant.spells,
                initiative: participant.initiative,
                hp: participant.hp ?? participant.maxHp,
                maxHp: participant.maxHp,
                ap: participant.maxAp,
                maxAp: participant.maxAp,
                mp: participant.maxMp,
                maxMp: participant.maxMp,
                rangeBonus: 0,
                powerBonus: 0,
                cooldowns,
                castsThisTurn: {},
                castsPerTargetThisTurn: {},
                statusEffects: [],
                alive: true
            };

            this.syncEntityStats(fighter);
            this.fighters.set(fighter.id, fighter);
        });

        this.turnOrder = [...this.fighters.values()]
            .sort((left, right) => right.initiative - left.initiative || Number(left.team === 'enemy') - Number(right.team === 'enemy'))
            .map((fighter) => fighter.id);
        this.turnOrderIndex = 0;

        this.appendLog(`Battle started with ${participants.length} fighters.`, 'system');
        const firstFighterId = this.turnOrder[0];
        if (firstFighterId) {
            this.beginTurn(firstFighterId, true);
        } else {
            this.endCombat('player');
        }
    }

    getCurrentTurnParticipant(): BattleFighter | null {
        if (!this.activeFighterId) {
            return null;
        }

        return this.fighters.get(this.activeFighterId) ?? null;
    }

    get activeFighterId(): string | null {
        if (!this.isActive || this.turnOrder.length === 0) {
            return null;
        }

        return this.turnOrder[this.turnOrderIndex] ?? null;
    }

    isPlayersTurn(): boolean {
        return this.getCurrentTurnParticipant()?.team === 'player';
    }

    getFighterAtCell(x: number, y: number, includeDead = false): BattleFighter | null {
        for (const fighter of this.fighters.values()) {
            if (!includeDead && !fighter.alive) {
                continue;
            }

            if (fighter.entity.gridX === x && fighter.entity.gridY === y) {
                return fighter;
            }
        }

        return null;
    }

    getLivingFighters(team?: BattleTeam): BattleFighter[] {
        return [...this.fighters.values()].filter((fighter) => fighter.alive && (team ? fighter.team === team : true));
    }

    getReachableCells(fighterId = this.activeFighterId): GridPoint[] {
        if (!fighterId) {
            return [];
        }

        const fighter = this.fighters.get(fighterId);
        if (!fighter || !fighter.alive) {
            return [];
        }

        const cells: GridPoint[] = [];
        const maxDistance = Math.max(0, fighter.mp);
        for (let x = fighter.entity.gridX - maxDistance; x <= fighter.entity.gridX + maxDistance; x++) {
            for (let y = fighter.entity.gridY - maxDistance; y <= fighter.entity.gridY + maxDistance; y++) {
                const distance = this.getDistance({ x: fighter.entity.gridX, y: fighter.entity.gridY }, { x, y });
                if (distance === 0 || distance > maxDistance || !this.battlefield.isCellInBounds(x, y)) {
                    continue;
                }

                if (this.battlefield.isCellBlocked(x, y, [fighter.id])) {
                    continue;
                }

                const path = this.findBattlePath(fighter, { x, y });
                if (path.length > 1 && path.length - 1 <= fighter.mp) {
                    cells.push({ x, y });
                }
            }
        }

        return cells;
    }

    getCastableCells(fighterId: string | null, spell: Spell): GridPoint[] {
        if (!fighterId) {
            return [];
        }

        const fighter = this.fighters.get(fighterId);
        if (!fighter || !fighter.alive) {
            return [];
        }

        const cells: GridPoint[] = [];
        const maxRange = spell.range.max + (spell.constraints.rangeModifiable ? this.getStatModifier(fighter, 'range') : 0);
        for (let x = fighter.entity.gridX - maxRange; x <= fighter.entity.gridX + maxRange; x++) {
            for (let y = fighter.entity.gridY - maxRange; y <= fighter.entity.gridY + maxRange; y++) {
                if (!this.battlefield.isCellInBounds(x, y)) {
                    continue;
                }

                const validation = this.validateCast(spell, fighter, { x, y });
                if (validation.valid) {
                    cells.push({ x, y });
                }
            }
        }

        return cells;
    }

    getAffectedCells(fighterId: string | null, spell: Spell, targetCell: GridPoint): GridPoint[] {
        if (!fighterId) {
            return [];
        }

        const fighter = this.fighters.get(fighterId);
        if (!fighter) {
            return [];
        }

        return this.getAffectedTiles(fighter, targetCell, spell);
    }

    castSpell(spell: Spell, targetCell: GridPoint): { valid: boolean; reason?: string } {
        if (!this.isActive) {
            return { valid: false, reason: 'Battle is not active.' };
        }

        const caster = this.getCurrentTurnParticipant();
        if (!caster || !caster.alive) {
            return { valid: false, reason: 'No active fighter.' };
        }

        const validation = this.validateCast(spell, caster, targetCell);
        if (!validation.valid) {
            gameEvents.emit(EVENTS.COMBAT.ACTION_FAILED, validation.reason);
            return validation;
        }

        const targets = this.getAffectedFighters(spell, caster, targetCell);
        if (targets.length === 0 && !spell.constraints.freeCell) {
            const reason = 'No valid targets.';
            gameEvents.emit(EVENTS.COMBAT.ACTION_FAILED, reason);
            return { valid: false, reason };
        }

        caster.ap -= spell.apCost;
        caster.cooldowns[spell.id] = spell.constraints.cooldown;
        caster.castsThisTurn[spell.id] = (caster.castsThisTurn[spell.id] ?? 0) + 1;

        const targetKey = `${targetCell.x},${targetCell.y}`;
        const targetCounts = caster.castsPerTargetThisTurn[spell.id] ?? {};
        targetCounts[targetKey] = (targetCounts[targetKey] ?? 0) + 1;
        caster.castsPerTargetThisTurn[spell.id] = targetCounts;

        let totalDamage = 0;
        let totalHealing = 0;

        for (const target of targets) {
            for (const effect of spell.effects) {
                const outcome = this.applyEffect(effect, caster, target);
                totalDamage += outcome.damage;
                totalHealing += outcome.healing;
            }
        }

        this.syncEntityStats(caster);
        targets.forEach((target) => this.syncEntityStats(target));
        this.appendLog(this.describeSpellResult(caster, spell, targets, totalDamage, totalHealing), totalDamage > 0 ? 'damage' : totalHealing > 0 ? 'heal' : 'status');

        if (!this.checkVictory()) {
            this.emitStateChange(EVENTS.COMBAT.UPDATED);
        }

        return { valid: true };
    }

    async moveActiveFighter(path: GridPoint[]): Promise<{ valid: boolean; reason?: string }> {
        const fighter = this.getCurrentTurnParticipant();
        if (!fighter || !fighter.alive) {
            return { valid: false, reason: 'No active fighter.' };
        }

        if (path.length === 0) {
            return { valid: false, reason: 'No movement path selected.' };
        }

        if (fighter.mp < path.length) {
            return { valid: false, reason: 'Not enough MP.' };
        }

        for (const step of path) {
            if (!this.battlefield.isCellInBounds(step.x, step.y) || this.battlefield.isCellBlocked(step.x, step.y, [fighter.id])) {
                return { valid: false, reason: 'Movement path is blocked.' };
            }
        }

        await this.animateMovement(fighter, path);
        fighter.mp -= path.length;
        this.syncEntityStats(fighter);
        this.appendLog(`${fighter.name} moved ${path.length} tile${path.length > 1 ? 's' : ''}.`, 'system');
        this.emitStateChange(EVENTS.COMBAT.UPDATED);
        return { valid: true };
    }

    endTurn() {
        if (!this.isActive) {
            return;
        }

        const currentFighter = this.getCurrentTurnParticipant();
        if (!currentFighter) {
            return;
        }

        this.stopTurnTimer();
        this.advanceStatusDurations(currentFighter);
        this.syncEntityStats(currentFighter);

        if (this.checkVictory()) {
            return;
        }

        const nextTurnIndex = this.getNextLivingTurnIndex();
        if (nextTurnIndex === -1) {
            this.endCombat('player');
            return;
        }

        if (nextTurnIndex <= this.turnOrderIndex) {
            this.turnNumber += 1;
        }

        this.turnOrderIndex = nextTurnIndex;
        const nextFighterId = this.turnOrder[this.turnOrderIndex];
        this.beginTurn(nextFighterId, false);
    }

    private beginTurn(fighterId: string, emitStarted: boolean) {
        const fighter = this.fighters.get(fighterId);
        if (!fighter || !fighter.alive) {
            this.endTurn();
            return;
        }

        this.reduceCooldowns(fighter);
        fighter.castsThisTurn = {};
        fighter.castsPerTargetThisTurn = {};
        fighter.ap = Math.max(0, fighter.maxAp + this.getStatModifier(fighter, 'ap'));
        fighter.mp = Math.max(0, fighter.maxMp + this.getStatModifier(fighter, 'mp'));

        this.applyTurnStartEffects(fighter);
        this.syncEntityStats(fighter);
        if (this.checkVictory()) {
            return;
        }

        if (!fighter.alive) {
            this.endTurn();
            return;
        }

        this.remainingTurnSeconds = TURN_TIME_LIMIT_SECONDS;
        this.startTurnTimer();
        this.appendLog(`${fighter.name}'s turn has started.`, 'turn');
        gameEvents.emit(EVENTS.COMBAT.TURN_CHANGED, fighter.team);
        this.emitStateChange(emitStarted ? EVENTS.COMBAT.STARTED : EVENTS.COMBAT.UPDATED);

        if (fighter.team === 'enemy') {
            this.scene.time.delayedCall(450, () => {
                void this.performAITurn(fighter.id);
            });
        }
    }

    private async performAITurn(fighterId: string) {
        if (!this.isActive || this.activeFighterId !== fighterId) {
            return;
        }

        const fighter = this.fighters.get(fighterId);
        if (!fighter || !fighter.alive) {
            return;
        }

        const closestPlayer = this.getClosestEnemyTarget(fighter);
        if (!closestPlayer) {
            this.endTurn();
            return;
        }

        const immediateAction = this.findBestSpellAction(fighter);
        if (immediateAction) {
            this.castSpell(immediateAction.spell, immediateAction.targetCell);
            if (this.isActive) {
                this.scene.time.delayedCall(500, () => this.endTurn());
            }
            return;
        }

        const destination = this.findBestMovementCell(fighter, closestPlayer.entity.gridX, closestPlayer.entity.gridY);
        if (destination) {
            const path = this.findBattlePath(fighter, destination).slice(1);
            if (path.length > 0) {
                await this.moveActiveFighter(path);
            }
        }

        if (!this.isActive) {
            return;
        }

        const postMoveAction = this.findBestSpellAction(fighter);
        if (postMoveAction) {
            this.castSpell(postMoveAction.spell, postMoveAction.targetCell);
        }

        if (this.isActive) {
            this.scene.time.delayedCall(500, () => this.endTurn());
        }
    }

    private findBestSpellAction(fighter: BattleFighter): { spell: Spell; targetCell: GridPoint } | null {
        let bestAction: { spell: Spell; targetCell: GridPoint; score: number } | null = null;

        for (const spell of fighter.spells) {
            for (const targetCell of this.getSpellCandidateCells(fighter, spell)) {
                const validation = this.validateCast(spell, fighter, targetCell);
                if (!validation.valid) {
                    continue;
                }

                const score = this.scoreSpellCast(spell, fighter, targetCell);
                if (score <= 0) {
                    continue;
                }

                if (!bestAction || score > bestAction.score) {
                    bestAction = { spell, targetCell, score };
                }
            }
        }

        return bestAction ? { spell: bestAction.spell, targetCell: bestAction.targetCell } : null;
    }

    private findBestMovementCell(fighter: BattleFighter, targetX: number, targetY: number): GridPoint | null {
        const reachableCells = this.getReachableCells(fighter.id);
        let bestCell: GridPoint | null = null;
        let bestDistance = this.getDistance({ x: fighter.entity.gridX, y: fighter.entity.gridY }, { x: targetX, y: targetY });

        for (const cell of reachableCells) {
            const distance = this.getDistance(cell, { x: targetX, y: targetY });
            if (distance < bestDistance) {
                bestDistance = distance;
                bestCell = cell;
            }
        }

        return bestCell;
    }

    private getClosestEnemyTarget(fighter: BattleFighter): BattleFighter | null {
        const enemies = this.getLivingFighters(fighter.team === 'player' ? 'enemy' : 'player');
        let closest: BattleFighter | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (const enemy of enemies) {
            const distance = this.getDistance(
                { x: fighter.entity.gridX, y: fighter.entity.gridY },
                { x: enemy.entity.gridX, y: enemy.entity.gridY }
            );
            if (distance < bestDistance) {
                bestDistance = distance;
                closest = enemy;
            }
        }

        return closest;
    }

    private getSpellCandidateCells(fighter: BattleFighter, spell: Spell): GridPoint[] {
        const candidates = new Map<string, GridPoint>();
        const addCandidate = (cell: GridPoint) => {
            candidates.set(`${cell.x},${cell.y}`, cell);
        };

        if (spell.effects.some((effect) => (effect.targetType ?? 'enemy') === 'self')) {
            addCandidate({ x: fighter.entity.gridX, y: fighter.entity.gridY });
        }

        this.getLivingFighters().forEach((target) => {
            const isRelevantTarget = spell.effects.some((effect) => this.matchesTargetType(fighter, target, effect.targetType));
            if (isRelevantTarget) {
                addCandidate({ x: target.entity.gridX, y: target.entity.gridY });
            }
        });

        if (spell.constraints.freeCell) {
            this.getCastableCells(fighter.id, spell).forEach(addCandidate);
        }

        return [...candidates.values()];
    }

    private validateCast(spell: Spell, caster: BattleFighter, targetCell: GridPoint): { valid: boolean; reason?: string } {
        if (this.activeFighterId !== caster.id) {
            return { valid: false, reason: 'It is not this fighter\'s turn.' };
        }

        if (caster.ap < spell.apCost) {
            return { valid: false, reason: 'Not enough AP.' };
        }

        if ((caster.cooldowns[spell.id] ?? 0) > 0) {
            return { valid: false, reason: 'Spell is on cooldown.' };
        }

        if ((caster.castsThisTurn[spell.id] ?? 0) >= spell.constraints.maxCastsPerTurn) {
            return { valid: false, reason: 'Spell cast limit reached this turn.' };
        }

        const targetKey = `${targetCell.x},${targetCell.y}`;
        if ((caster.castsPerTargetThisTurn[spell.id]?.[targetKey] ?? 0) >= spell.constraints.maxCastsPerTarget) {
            return { valid: false, reason: 'Target cast limit reached.' };
        }

        const distance = this.getDistance({ x: caster.entity.gridX, y: caster.entity.gridY }, targetCell);
        const rangeBonus = spell.constraints.rangeModifiable ? this.getStatModifier(caster, 'range') : 0;
        const maxRange = spell.range.max + rangeBonus;
        if (distance < spell.range.min || distance > maxRange) {
            return { valid: false, reason: 'Target is out of range.' };
        }

        if (!this.battlefield.isCellInBounds(targetCell.x, targetCell.y)) {
            return { valid: false, reason: 'Target cell is outside the battlefield.' };
        }

        if (spell.constraints.lineOfSight && !this.hasLineOfSight(caster, targetCell)) {
            return { valid: false, reason: 'Line of sight is blocked.' };
        }

        if (spell.constraints.freeCell && this.getFighterAtCell(targetCell.x, targetCell.y)) {
            return { valid: false, reason: 'Target cell must be empty.' };
        }

        const targets = this.getAffectedFighters(spell, caster, targetCell);
        if (targets.length === 0 && !spell.constraints.freeCell) {
            return { valid: false, reason: 'No valid targets on those tiles.' };
        }

        return { valid: true };
    }

    private getAffectedFighters(spell: Spell, caster: BattleFighter, targetCell: GridPoint): BattleFighter[] {
        const affectedTiles = this.getAffectedTiles(caster, targetCell, spell);
        const seen = new Set<string>();
        const fighters: BattleFighter[] = [];

        for (const tile of affectedTiles) {
            const fighter = this.getFighterAtCell(tile.x, tile.y);
            if (!fighter || seen.has(fighter.id)) {
                continue;
            }

            const shouldInclude = spell.effects.some((effect) => this.matchesTargetType(caster, fighter, effect.targetType));
            if (shouldInclude) {
                fighters.push(fighter);
                seen.add(fighter.id);
            }
        }

        return fighters;
    }

    private getAffectedTiles(caster: BattleFighter, targetCell: GridPoint, spell: Spell): GridPoint[] {
        const size = Math.max(0, spell.aoe.size);
        const uniqueTiles = new Map<string, GridPoint>();
        const addTile = (x: number, y: number) => {
            if (!this.battlefield.isCellInBounds(x, y)) {
                return;
            }
            uniqueTiles.set(`${x},${y}`, { x, y });
        };

        switch (spell.aoe.shape) {
            case 'single':
                addTile(targetCell.x, targetCell.y);
                break;
            case 'circle':
                for (let dx = -size; dx <= size; dx++) {
                    for (let dy = -size; dy <= size; dy++) {
                        if (Math.abs(dx) + Math.abs(dy) <= size) {
                            addTile(targetCell.x + dx, targetCell.y + dy);
                        }
                    }
                }
                break;
            case 'square':
                for (let dx = -size; dx <= size; dx++) {
                    for (let dy = -size; dy <= size; dy++) {
                        addTile(targetCell.x + dx, targetCell.y + dy);
                    }
                }
                break;
            case 'cross':
                addTile(targetCell.x, targetCell.y);
                for (let step = 1; step <= size; step++) {
                    addTile(targetCell.x + step, targetCell.y);
                    addTile(targetCell.x - step, targetCell.y);
                    addTile(targetCell.x, targetCell.y + step);
                    addTile(targetCell.x, targetCell.y - step);
                }
                break;
            case 'line': {
                const direction = this.getNormalizedDirection(
                    targetCell.x - caster.entity.gridX,
                    targetCell.y - caster.entity.gridY
                );
                for (let step = 0; step <= size; step++) {
                    addTile(targetCell.x + direction.x * step, targetCell.y + direction.y * step);
                }
                break;
            }
            case 'cone': {
                const direction = this.getNormalizedDirection(
                    targetCell.x - caster.entity.gridX,
                    targetCell.y - caster.entity.gridY
                );
                const perpendicular = { x: -direction.y, y: direction.x };
                for (let depth = 1; depth <= size; depth++) {
                    const origin = {
                        x: caster.entity.gridX + direction.x * depth,
                        y: caster.entity.gridY + direction.y * depth
                    };
                    for (let offset = -(depth - 1); offset <= depth - 1; offset++) {
                        addTile(origin.x + perpendicular.x * offset, origin.y + perpendicular.y * offset);
                    }
                }
                break;
            }
            default:
                addTile(targetCell.x, targetCell.y);
        }

        return [...uniqueTiles.values()];
    }

    private applyEffect(effect: SpellEffect, caster: BattleFighter, target: BattleFighter): { damage: number; healing: number } {
        if (!this.matchesTargetType(caster, target, effect.targetType)) {
            return { damage: 0, healing: 0 };
        }

        if (effect.chance !== undefined && Phaser.Math.Between(1, 100) > effect.chance) {
            return { damage: 0, healing: 0 };
        }

        switch (effect.type) {
            case SpellEffectType.DAMAGE: {
                const rolled = Phaser.Math.Between(effect.min, effect.max);
                const damage = Math.max(0, rolled + this.getStatModifier(caster, 'power'));
                const dealt = this.applyDamage(target, damage);
                return { damage: dealt, healing: 0 };
            }
            case SpellEffectType.HEAL: {
                const healing = Phaser.Math.Between(effect.min, effect.max);
                target.hp = Math.min(target.maxHp, target.hp + healing);
                return { damage: 0, healing };
            }
            case SpellEffectType.BUFF_AP:
                this.addStatusEffect(target, effect, caster, 'boost', 'ap');
                return { damage: 0, healing: 0 };
            case SpellEffectType.BUFF_MP:
                this.addStatusEffect(target, effect, caster, 'boost', 'mp');
                return { damage: 0, healing: 0 };
            case SpellEffectType.BUFF_RANGE:
                this.addStatusEffect(target, effect, caster, 'boost', 'range');
                return { damage: 0, healing: 0 };
            case SpellEffectType.BUFF_POWER:
                this.addStatusEffect(target, effect, caster, 'boost', 'power');
                return { damage: 0, healing: 0 };
            case SpellEffectType.DEBUFF_AP:
                this.addStatusEffect(target, effect, caster, 'debuff', 'ap');
                target.ap = Math.max(0, target.ap - (effect.value ?? effect.min));
                return { damage: 0, healing: 0 };
            case SpellEffectType.DEBUFF_MP:
                this.addStatusEffect(target, effect, caster, 'debuff', 'mp');
                target.mp = Math.max(0, target.mp - (effect.value ?? effect.min));
                return { damage: 0, healing: 0 };
            case SpellEffectType.PUSH:
                this.pushTarget(caster, target, effect.value ?? effect.max);
                return { damage: 0, healing: 0 };
            case SpellEffectType.PULL:
                this.pullTarget(caster, target, effect.value ?? effect.max);
                return { damage: 0, healing: 0 };
            case SpellEffectType.STATE:
                this.applyStateEffect(effect, caster, target);
                return { damage: 0, healing: 0 };
            default:
                return { damage: 0, healing: 0 };
        }
    }

    private applyStateEffect(effect: SpellEffect, caster: BattleFighter, target: BattleFighter) {
        const state = effect.state?.toUpperCase();
        if (state === 'POISON') {
            this.addStatusEffect(target, effect, caster, 'poison');
            return;
        }

        if (state === 'SHIELD') {
            this.addStatusEffect(target, effect, caster, 'shield', 'shield');
            return;
        }

        this.addStatusEffect(target, effect, caster, 'state');
    }

    private addStatusEffect(
        target: BattleFighter,
        effect: SpellEffect,
        caster: BattleFighter,
        kind: StatusEffectInstance['kind'],
        stat?: StatusEffectStat
    ) {
        const value = effect.value ?? effect.max;
        const duration = effect.duration ?? 1;
        const state = effect.state?.toUpperCase();
        const name = state === 'POISON'
            ? 'Poison'
            : state === 'SHIELD'
                ? 'Shield'
                : stat
                    ? `${kind === 'debuff' ? '-' : '+'}${stat.toUpperCase()}`
                    : 'State';

        target.statusEffects.push({
            id: `${caster.id}-${effect.type}-${target.statusEffects.length}-${this.turnNumber}`,
            name,
            kind,
            value,
            duration,
            sourceFighterId: caster.id,
            stat,
            tick: state === 'POISON' ? 'turnStart' : undefined,
            state
        });
    }

    private applyTurnStartEffects(fighter: BattleFighter) {
        for (const effect of fighter.statusEffects) {
            if (effect.tick === 'turnStart' && effect.kind === 'poison') {
                const damage = this.applyDamage(fighter, effect.value);
                if (damage > 0) {
                    this.appendLog(`${fighter.name} suffers ${damage} poison damage.`, 'status');
                }
            }
        }
    }

    private advanceStatusDurations(fighter: BattleFighter) {
        fighter.statusEffects = fighter.statusEffects
            .map((effect) => ({ ...effect, duration: effect.duration - 1 }))
            .filter((effect) => effect.duration > 0 && effect.value > 0);
    }

    private applyDamage(target: BattleFighter, amount: number): number {
        let remainingDamage = amount;
        for (const effect of target.statusEffects) {
            if (effect.kind !== 'shield') {
                continue;
            }

            const absorbed = Math.min(effect.value, remainingDamage);
            effect.value -= absorbed;
            remainingDamage -= absorbed;
            if (remainingDamage === 0) {
                break;
            }
        }

        target.statusEffects = target.statusEffects.filter((effect) => effect.value > 0 || effect.kind !== 'shield');
        if (remainingDamage === 0) {
            return 0;
        }

        target.hp = Math.max(0, target.hp - remainingDamage);
        if (target.hp === 0) {
            target.alive = false;
            target.entity.sprite.setAlpha(0.45);
            this.appendLog(`${target.name} has been defeated.`, 'victory');
        }

        return remainingDamage;
    }

    private pushTarget(caster: BattleFighter, target: BattleFighter, distance: number) {
        const direction = this.getNormalizedDirection(
            target.entity.gridX - caster.entity.gridX,
            target.entity.gridY - caster.entity.gridY
        );
        this.translateTarget(target, direction, distance);
    }

    private pullTarget(caster: BattleFighter, target: BattleFighter, distance: number) {
        const direction = this.getNormalizedDirection(
            caster.entity.gridX - target.entity.gridX,
            caster.entity.gridY - target.entity.gridY
        );
        this.translateTarget(target, direction, distance);
    }

    private translateTarget(target: BattleFighter, direction: GridPoint, distance: number) {
        let currentPosition = { x: target.entity.gridX, y: target.entity.gridY };
        for (let step = 0; step < distance; step++) {
            const nextPosition = {
                x: currentPosition.x + direction.x,
                y: currentPosition.y + direction.y
            };

            if (!this.battlefield.isCellInBounds(nextPosition.x, nextPosition.y) || this.battlefield.isCellBlocked(nextPosition.x, nextPosition.y, [target.id])) {
                break;
            }

            currentPosition = nextPosition;
        }

        target.entity.setGridPosition(currentPosition.x, currentPosition.y);
    }

    private matchesTargetType(caster: BattleFighter, target: BattleFighter, targetType: SpellEffect['targetType'] = 'enemy'): boolean {
        if (targetType === 'all') {
            return true;
        }

        if (targetType === 'self') {
            return caster.id === target.id;
        }

        if (targetType === 'ally') {
            return caster.team === target.team;
        }

        return caster.team !== target.team;
    }

    private getDistance(start: GridPoint, end: GridPoint): number {
        return Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
    }

    private hasLineOfSight(caster: BattleFighter, targetCell: GridPoint): boolean {
        const targetFighter = this.getFighterAtCell(targetCell.x, targetCell.y);
        const ignoredIds = [caster.id];
        if (targetFighter) {
            ignoredIds.push(targetFighter.id);
        }

        const line = this.getLinePoints(
            { x: caster.entity.gridX, y: caster.entity.gridY },
            targetCell
        );
        return line.every((cell) => !this.battlefield.isCellBlocked(cell.x, cell.y, ignoredIds));
    }

    private getLinePoints(start: GridPoint, end: GridPoint): GridPoint[] {
        const points: GridPoint[] = [];
        const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
        if (steps <= 1) {
            return points;
        }

        for (let step = 1; step < steps; step++) {
            const x = Math.round(start.x + ((end.x - start.x) * step) / steps);
            const y = Math.round(start.y + ((end.y - start.y) * step) / steps);
            points.push({ x, y });
        }

        return points;
    }

    private getNormalizedDirection(dx: number, dy: number): GridPoint {
        if (Math.abs(dx) > Math.abs(dy)) {
            return { x: Math.sign(dx), y: 0 };
        }

        if (Math.abs(dy) > Math.abs(dx)) {
            return { x: 0, y: Math.sign(dy) };
        }

        return { x: Math.sign(dx), y: Math.sign(dy) };
    }

    private findBattlePath(fighter: BattleFighter, destination: GridPoint) {
        return Pathfinding.findPath(
            { x: fighter.entity.gridX, y: fighter.entity.gridY, walkable: true },
            { x: destination.x, y: destination.y, walkable: true },
            {
                hasObstacle: (x, y) => this.battlefield.isCellBlocked(x, y, [fighter.id]),
                isValid: (x, y) => this.battlefield.isCellInBounds(x, y)
            },
            {
                allowDiagonals: false,
                maxDistance: fighter.mp
            }
        );
    }

    private async animateMovement(fighter: BattleFighter, path: GridPoint[]): Promise<void> {
        await new Promise<void>((resolve) => {
            fighter.entity.moveAlongPath(path, undefined, () => {
                resolve();
            });
        });
    }

    private getStatModifier(fighter: BattleFighter, stat: StatusEffectStat): number {
        return fighter.statusEffects
            .filter((effect) => effect.stat === stat)
            .reduce((total, effect) => total + (effect.kind === 'debuff' ? -effect.value : effect.value), 0);
    }

    private reduceCooldowns(fighter: BattleFighter) {
        Object.keys(fighter.cooldowns).forEach((spellId) => {
            fighter.cooldowns[spellId] = Math.max(0, (fighter.cooldowns[spellId] ?? 0) - 1);
        });
    }

    private describeSpellResult(caster: BattleFighter, spell: Spell, targets: BattleFighter[], totalDamage: number, totalHealing: number) {
        const targetNames = targets.map((target) => target.name).join(', ');
        if (totalDamage > 0) {
            return `${caster.name} cast ${spell.name} on ${targetNames} for ${totalDamage} total damage.`;
        }

        if (totalHealing > 0) {
            return `${caster.name} cast ${spell.name} and restored ${totalHealing} health.`;
        }

        return `${caster.name} cast ${spell.name}${targetNames ? ` on ${targetNames}` : ''}.`;
    }

    private scoreSpellCast(spell: Spell, caster: BattleFighter, targetCell: GridPoint): number {
        const targets = this.getAffectedFighters(spell, caster, targetCell);
        if (targets.length === 0 && !spell.constraints.freeCell) {
            return Number.NEGATIVE_INFINITY;
        }

        const enemyTargets = targets.filter((target) => target.team !== caster.team);
        const allyTargets = targets.filter((target) => target.team === caster.team && target.id !== caster.id);

        const effectScore = spell.effects.reduce((score, effect) => {
            return score + targets.reduce((effectTotal, target) => {
                if (!this.matchesTargetType(caster, target, effect.targetType)) {
                    return effectTotal;
                }

                return effectTotal + this.scoreEffectOnTarget(effect, caster, target);
            }, 0);
        }, 0);

        return effectScore + (enemyTargets.length * 2) - (allyTargets.length * 3);
    }

    private scoreEffectOnTarget(effect: SpellEffect, caster: BattleFighter, target: BattleFighter): number {
        const averageValue = effect.value ?? (effect.min + effect.max) / 2;
        const isAlly = caster.team === target.team;

        switch (effect.type) {
            case SpellEffectType.DAMAGE: {
                const killBonus = !isAlly && averageValue >= target.hp ? 12 : 0;
                return isAlly ? -(averageValue * 1.5) : averageValue + killBonus;
            }
            case SpellEffectType.HEAL:
                return isAlly ? averageValue * 0.75 : -(averageValue * 0.5);
            case SpellEffectType.BUFF_AP:
            case SpellEffectType.BUFF_MP:
            case SpellEffectType.BUFF_RANGE:
            case SpellEffectType.BUFF_POWER:
                return isAlly ? 6 + averageValue : -8;
            case SpellEffectType.DEBUFF_AP:
            case SpellEffectType.DEBUFF_MP:
                return isAlly ? -8 : 6 + (averageValue * 2);
            case SpellEffectType.PUSH:
            case SpellEffectType.PULL:
                return isAlly ? -3 : 4;
            case SpellEffectType.STATE: {
                const state = effect.state?.toUpperCase();
                if (state === 'SHIELD') {
                    return isAlly ? 8 + averageValue : -6;
                }

                if (state === 'POISON') {
                    return isAlly ? -10 : 8 + (averageValue * 1.5);
                }

                return isAlly ? 4 : 3;
            }
            default:
                return 0;
        }
    }

    private getNextLivingTurnIndex(): number {
        if (this.turnOrder.length === 0) {
            return -1;
        }

        for (let offset = 1; offset <= this.turnOrder.length; offset++) {
            const nextIndex = (this.turnOrderIndex + offset) % this.turnOrder.length;
            const fighter = this.fighters.get(this.turnOrder[nextIndex]);
            if (fighter?.alive) {
                return nextIndex;
            }
        }

        return -1;
    }

    private checkVictory(): boolean {
        const playerAlive = this.getLivingFighters('player').length > 0;
        const enemyAlive = this.getLivingFighters('enemy').length > 0;

        if (playerAlive && enemyAlive) {
            return false;
        }

        this.endCombat(playerAlive ? 'player' : 'enemy');
        return true;
    }

    private endCombat(winner: BattleTeam) {
        this.stopTurnTimer();
        this.isActive = false;
        this.winner = winner;
        this.appendLog(`${winner === 'player' ? 'Players' : 'Enemies'} win the battle.`, 'victory');
        this.emitStateChange(EVENTS.COMBAT.ENDED);
    }

    private startTurnTimer() {
        this.stopTurnTimer();
        this.turnTimer = this.scene.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                if (!this.isActive) {
                    return;
                }

                this.remainingTurnSeconds = Math.max(0, this.remainingTurnSeconds - 1);
                this.emitStateChange(EVENTS.COMBAT.UPDATED);
                if (this.remainingTurnSeconds === 0) {
                    this.endTurn();
                }
            }
        });
    }

    private stopTurnTimer() {
        if (this.turnTimer) {
            this.turnTimer.destroy();
            this.turnTimer = null;
        }
    }

    private emitStateChange(eventName: string) {
        const snapshot = this.getSnapshot();
        gameEvents.emit(eventName, snapshot);
        if (eventName !== EVENTS.COMBAT.UPDATED && eventName !== EVENTS.COMBAT.ENDED) {
            gameEvents.emit(EVENTS.COMBAT.UPDATED, snapshot);
        }

        const player = this.fighters.get('player-main');
        if (player) {
            gameEvents.emit(EVENTS.PLAYER.STATS_CHANGED, {
                hp: player.hp,
                maxHp: player.maxHp,
                ap: player.ap,
                maxAp: player.maxAp,
                mp: player.mp,
                maxMp: player.maxMp,
                initiative: player.initiative,
                spells: player.spells,
                statuses: player.statusEffects.map((effect) => `${effect.name} (${effect.duration})`)
            });
        }
    }

    private getSnapshot(): BattleSnapshot {
        return {
            isActive: this.isActive,
            activeFighterId: this.activeFighterId,
            activeTeam: this.getCurrentTurnParticipant()?.team ?? null,
            turnNumber: this.turnNumber,
            remainingTurnSeconds: this.remainingTurnSeconds,
            roundOrder: [...this.turnOrder],
            fighters: [...this.fighters.values()].map<BattleFighterSnapshot>((fighter) => ({
                id: fighter.id,
                name: fighter.name,
                team: fighter.team,
                hp: fighter.hp,
                maxHp: fighter.maxHp,
                ap: fighter.ap,
                maxAp: fighter.maxAp,
                mp: fighter.mp,
                maxMp: fighter.maxMp,
                initiative: fighter.initiative,
                alive: fighter.alive,
                position: {
                    x: fighter.entity.gridX,
                    y: fighter.entity.gridY
                },
                cooldowns: { ...fighter.cooldowns },
                statusEffects: fighter.statusEffects.map((effect) => ({ ...effect }))
            })),
            logs: [...this.logs],
            winner: this.winner
        };
    }

    private appendLog(message: string, type: BattleLogEntry['type']) {
        this.logs = [...this.logs, {
            id: `${Date.now()}-${this.logs.length}`,
            message,
            type
        }].slice(-MAX_LOG_ENTRIES);
        gameEvents.emit(EVENTS.COMBAT.LOG, message);
    }

    private syncEntityStats(fighter: BattleFighter) {
        fighter.entity.hp = fighter.hp;
        fighter.entity.ap = fighter.ap;
        fighter.entity.mp = fighter.mp;
    }
}
