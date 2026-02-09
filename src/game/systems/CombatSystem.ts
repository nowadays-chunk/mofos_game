import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { OtherPlayer } from '../entities/OtherPlayer';
import { Spell } from '../data/Courants';

export interface CombatParticipant {
    entity: Player | OtherPlayer;
    hp: number;
    maxHp: number;
    ap: number;
    maxAp: number;
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
            hp: 100,
            maxHp: 100,
            ap: 6,
            maxAp: 6
        };

        this.opponent = {
            entity: opponent,
            hp: 100,
            maxHp: 100,
            ap: 6,
            maxAp: 6
        };

        this.currentTurn = 'player';

        console.log(`Combat started! ${player.courant} vs ${opponent.courant}`);
        console.log(`Player spells:`, player.spells.map(s => s.name));
        console.log(`Opponent spells:`, opponent.spells.map(s => s.name));

        // Emit combat start event
        this.scene.events.emit('combat-start', {
            player: this.player,
            opponent: this.opponent
        });
    }

    castSpell(spell: Spell, caster: CombatParticipant, target: CombatParticipant) {
        if (!this.isActive) return;

        // Check AP cost
        if (caster.ap < (spell.apCost || 3)) {
            console.log('Not enough AP!');
            return;
        }

        // Deduct AP
        caster.ap -= (spell.apCost || 3);

        // Calculate damage (placeholder logic)
        const baseDamage = Phaser.Math.Between(10, 25);
        target.hp = Math.max(0, target.hp - baseDamage);

        console.log(`${spell.name} cast! Dealt ${baseDamage} damage. Target HP: ${target.hp}/${target.maxHp}`);

        // Emit spell cast event
        this.scene.events.emit('spell-cast', {
            spell,
            caster,
            target,
            damage: baseDamage
        });

        // Check for combat end
        if (target.hp <= 0) {
            this.endCombat(caster === this.player ? 'player' : 'opponent');
        }
    }

    endTurn() {
        if (!this.isActive) return;

        // Switch turns
        this.currentTurn = this.currentTurn === 'player' ? 'opponent' : 'player';

        // Restore AP
        const currentParticipant = this.currentTurn === 'player' ? this.player : this.opponent;
        if (currentParticipant) {
            currentParticipant.ap = currentParticipant.maxAp;
        }

        console.log(`Turn switched to: ${this.currentTurn}`);

        // Emit turn change event
        this.scene.events.emit('turn-change', this.currentTurn);

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
                s => (s.apCost || 3) <= this.opponent!.ap
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
        this.scene.events.emit('combat-end', winner);

        // Reset
        this.player = null;
        this.opponent = null;
    }

    getCurrentTurnParticipant(): CombatParticipant | null {
        return this.currentTurn === 'player' ? this.player : this.opponent;
    }
}
