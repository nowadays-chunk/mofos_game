
import Phaser from 'phaser';
import { IsoUtils } from '../utils/IsoUtils';
import { CourantType, Spell, getSpellsForCourant } from '../data/Courants';

export class OtherPlayer {
    scene: Phaser.Scene;
    sprite: Phaser.GameObjects.Sprite;
    gridX: number;
    gridY: number;
    courant: CourantType;
    spells: Spell[];

    // Stats
    hp: number;
    maxHp: number;
    ap: number;
    maxAp: number;
    mp: number;
    maxMp: number;
    level: number = 1;

    constructor(scene: Phaser.Scene, x: number, y: number, characterType: string) {
        this.scene = scene;
        this.gridX = x;
        this.gridY = y;

        // Assign random Courant
        const keys = Object.values(CourantType);
        this.courant = keys[Math.floor(Math.random() * keys.length)];
        this.spells = getSpellsForCourant(this.courant);

        // Initialize Stats (Randomized for variety)
        this.level = Phaser.Math.Between(1, 5);
        this.maxHp = 80 + (this.level * 10);
        this.hp = this.maxHp;
        this.maxAp = 6;
        this.ap = this.maxAp;
        this.maxMp = 3;
        this.mp = this.maxMp;

        console.log(`OtherPlayer assigned to ${this.courant}`);

        const isoPos = IsoUtils.cartesianToIso(x, y);

        // Use the first frame of the idle animation as the initial texture
        this.sprite = scene.add.sprite(isoPos.x, isoPos.y, `${characterType}_idle_0`);
        this.sprite.setOrigin(0.5, 1); // Anchor at bottom center
        this.sprite.setDepth(isoPos.y); // Depth sorting

        // Scale to fit tile with some variation
        const targetWidth = 64 * 1.25;
        const baseScale = targetWidth / this.sprite.width;
        const variation = Phaser.Math.FloatBetween(0.9, 1.1); // Reduced variation
        this.sprite.setScale(baseScale * variation);

        // Random tint for variety
        this.sprite.setTint(Math.random() * 0xffffff);

        // Play the idle animation
        this.sprite.play(`${characterType}_idle`);
    }

    setGridPosition(x: number, y: number) {
        this.gridX = x;
        this.gridY = y;
        const isoPos = IsoUtils.cartesianToIso(x, y);
        this.sprite.setPosition(isoPos.x, isoPos.y);
        this.sprite.setDepth(isoPos.y);
    }
}
