
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

    constructor(scene: Phaser.Scene, x: number, y: number, characterType: string) {
        this.scene = scene;
        this.gridX = x;
        this.gridY = y;

        // Assign random Courant
        const keys = Object.values(CourantType);
        this.courant = keys[Math.floor(Math.random() * keys.length)];
        this.spells = getSpellsForCourant(this.courant);

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
}
