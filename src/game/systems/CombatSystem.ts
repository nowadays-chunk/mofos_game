import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { OtherPlayer } from '../entities/OtherPlayer';
import { Spell, SpellEffectType, AoEConfig } from '../data/Courants';
import { gameEvents, EVENTS } from '../GameEventBus';

export interface CombatParticipant {
    entity: Player | OtherPlayer;
    hp: number;
    maxHp: number;
    ap: number;
    maxAp: number;
    mp: number;
    maxMp: number;
    cooldowns: Map<string, number>; // Spell ID -> turns remaining
}

export class CombatSystem {
    scene: Phaser.Scene;
    isActive: boolean = false;
    player: CombatParticipant | null = null;
    opponent: CombatParticipant | null = null;
    currentTurn: 'player' | 'opponent' = 'player';

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    startCombat(player: Player, opponent: OtherPlayer) {
        this.isActive = true;

        // Initialize combat participants
        this.player = {
            entity: player,
            hp: player.hp,
            maxHp: player.maxHp,
            ap: player.ap,
            maxAp: player.maxAp,
            mp: player.mp,
            maxMp: player.maxMp,
            cooldowns: new Map()
        };

        this.opponent = {
            entity: opponent,
            hp: opponent.hp,
            maxHp: opponent.maxHp,
            ap: opponent.ap,
            maxAp: opponent.maxAp,
            mp: opponent.mp,
            maxMp: opponent.maxMp,
            cooldowns: new Map()
        };

        this.currentTurn = 'player';

        console.log(`Combat started! ${player.courant} vs ${opponent.courant}`);
        console.log(`Player spells:`, player.spells.map(s => s.name));
        console.log(`Opponent spells:`, opponent.spells.map(s => s.name));

        // Emit combat start event
        gameEvents.emit(EVENTS.COMBAT.STARTED, {
            player: this.player,
            opponent: this.opponent,
            currentTurn: this.currentTurn
        });
    }

    validateCast(spell: Spell, caster: CombatParticipant, target: CombatParticipant): { valid: boolean; reason?: string } {
        // 1. Check AP
        if (caster.ap < spell.apCost) {
            return { valid: false, reason: 'Not enough AP' };
        }

        // 2. Check Range (Manhattan distance)
        const dist = Math.abs(caster.entity.gridX - target.entity.gridX) +
            Math.abs(caster.entity.gridY - target.entity.gridY);

        if (dist > spell.range.max) {
            return { valid: false, reason: 'Target out of range' };
        }

        if (dist < spell.range.min) {
            return { valid: false, reason: 'Target too close' };
        }

        // 3. Check Cooldown
        const currentCd = caster.cooldowns.get(spell.id) || 0;
        if (currentCd > 0) {
            return { valid: false, reason: `Spell on cooldown (${currentCd})` };
        }

        return { valid: true };
    }

    getAffectedTiles(centerNode: { x: number, y: number }, _aoe: AoEConfig): { x: number, y: number }[] {
        // Placeholder for AoE logic
        // For now, just return the center tile
        return [{ x: centerNode.x, y: centerNode.y }];
    }

    castSpell(spell: Spell, caster: CombatParticipant, target: CombatParticipant) {
        if (!this.isActive) return;

        const validation = this.validateCast(spell, caster, target);
        if (!validation.valid) {
            console.log(`Cast failed: ${validation.reason}`);
            return;
        }

        // Deduct AP
        caster.ap -= spell.apCost;

        // Apply Cooldown
        if (spell.constraints.cooldown > 0) {
            caster.cooldowns.set(spell.id, spell.constraints.cooldown);
        }

        // Apply Effects
        let totalDamage = 0;

        spell.effects.forEach(effect => {
            // Basic effect handling for now
            if (effect.type === SpellEffectType.DAMAGE) {
                const damage = Phaser.Math.Between(effect.min, effect.max);
                target.hp = Math.max(0, target.hp - damage);
                totalDamage += damage;
            }
            // Add other effect handlers here (HEAL, BUFF, etc.)
        });

        console.log(`${spell.name} cast! Dealt ${totalDamage} damage.`);

        // Emit spell cast event
        gameEvents.emit(EVENTS.COMBAT.LOG, `${caster.entity === this.player?.entity ? 'You' : 'Opponent'} cast ${spell.name} for ${totalDamage} damage.`);

        // Update stats
        if (caster === this.player) {
            // Include cooldown updates in stats changed? Or separate event?
            // For now, just AP/MP
            gameEvents.emit(EVENTS.PLAYER.STATS_CHANGED, {
                ap: caster.ap,
                mp: caster.mp
            });
        }

        // Check for combat end
        if (target.hp <= 0) {
            this.endCombat(caster === this.player ? 'player' : 'opponent');
        }
    }

    // Movement Logic
    canMove(participant: CombatParticipant, pathLength: number): boolean {
        return participant.mp >= pathLength;
    }

    consumeMp(participant: CombatParticipant, amount: number) {
        participant.mp = Math.max(0, participant.mp - amount);
        if (participant === this.player) {
            gameEvents.emit(EVENTS.PLAYER.STATS_CHANGED, { mp: participant.mp });
        }
    }

    endTurn() {
        if (!this.isActive) return;

        // Switch turns
        this.currentTurn = this.currentTurn === 'player' ? 'opponent' : 'player';

        // Restore AP and MP & Decrease Cooldowns
        const nextParticipant = this.currentTurn === 'player' ? this.player : this.opponent;
        if (nextParticipant) {
            nextParticipant.ap = nextParticipant.maxAp;
            nextParticipant.mp = nextParticipant.maxMp;

            // Decrease cooldowns
            nextParticipant.cooldowns.forEach((cd, spellId) => {
                if (cd > 0) {
                    nextParticipant.cooldowns.set(spellId, cd - 1);
                }
            });
        }

        console.log(`Turn switched to: ${this.currentTurn}`);

        // Emit turn change event
        gameEvents.emit(EVENTS.COMBAT.TURN_CHANGED, this.currentTurn);

        // AI turn for opponent
        if (this.currentTurn === 'opponent' && this.opponent && this.player) {
            this.performAITurn();
        }
    }

    performAITurn() {
        if (!this.opponent || !this.player) return;

        // Simple AI: pick random spell and cast it
        this.scene.time.delayedCall(1000, () => {
            if (!this.opponent || !this.player) return;

            const availableSpells = this.opponent.entity.spells.filter(
                s => this.validateCast(s, this.opponent!, this.player!).valid
            );

            if (availableSpells.length > 0) {
                const randomSpell = availableSpells[Phaser.Math.Between(0, availableSpells.length - 1)];
                this.castSpell(randomSpell, this.opponent, this.player);
            }

            // End AI turn after a delay
            this.scene.time.delayedCall(1000, () => {
                this.endTurn();
            });
        });
    }

    endCombat(winner: 'player' | 'opponent') {
        console.log(`Combat ended! Winner: ${winner}`);

        this.isActive = false;

        // Emit combat end event
        gameEvents.emit(EVENTS.COMBAT.ENDED, winner);

        // Reset
        this.player = null;
        this.opponent = null;
    }

    getCurrentTurnParticipant(): CombatParticipant | null {
        return this.currentTurn === 'player' ? this.player : this.opponent;
    }
}
