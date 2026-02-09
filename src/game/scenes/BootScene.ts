import Phaser from 'phaser';
import { CHARACTERS, OBJECTS } from '../constants';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load assets here
        // this.load.setBaseURL('https://labs.phaser.io'); // Removed to load local assets
        this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
        this.load.image('logo', 'https://labs.phaser.io/assets/sprites/phaser3-logo.png');
        this.load.image('red', 'https://labs.phaser.io/assets/particles/red.png');

        // Load Characters
        CHARACTERS.forEach(char => {
            // Extract base character name from folder name (e.g., "Bloody_Alchemist_1" -> "Bloody_Alchemist")
            // Character folders are named like "Bloody_Alchemist_1", "Fallen_Angels_2", etc.
            // Files inside are named like "0_Bloody_Alchemist_Idle_000.png", "0_Fallen_Angels_Idle_000.png"
            const baseCharName = char.replace(/_\d+$/, ''); // Remove trailing _1, _2, _3

            // Idle
            for (let i = 0; i <= 17; i++) {
                const paddedIndex = i.toString().padStart(3, '0');
                this.load.image(
                    `${char}_idle_${i}`,
                    `design/characters/${char}/PNG/PNG Sequences/Idle/0_${baseCharName}_Idle_${paddedIndex}.png`
                );
            }

            // Run
            for (let i = 0; i <= 11; i++) {
                const paddedIndex = i.toString().padStart(3, '0');
                this.load.image(
                    `${char}_run_${i}`,
                    `design/characters/${char}/PNG/PNG Sequences/Running/0_${baseCharName}_Running_${paddedIndex}.png`
                );
            }
        });

        // Load Objects
        // ROCKS
        OBJECTS.ROCKS.files.forEach(file => {
            // key can be the filename without extension for simplicity
            const key = file.split('.')[0];
            this.load.image(`rock_${key}`, `${OBJECTS.ROCKS.path}/${file}`);
        });

        // CRYSTALS
        OBJECTS.CRYSTALS.files.forEach(file => {
            const key = file.split('.')[0];
            this.load.image(`crystal_${key}`, `${OBJECTS.CRYSTALS.path}/${file}`);
        });

        // BUSHES
        OBJECTS.BUSHES.files.forEach(file => {
            const key = file.split('.')[0];
            this.load.image(`bush_${key}`, `${OBJECTS.BUSHES.path}/${file}`);
        });
    }

    create() {
        // Create animations for each character
        CHARACTERS.forEach(char => {
            this.anims.create({
                key: `${char}_idle`,
                frames: Array.from({ length: 18 }, (_, i) => ({ key: `${char}_idle_${i}` })),
                frameRate: 12,
                repeat: -1
            });

            this.anims.create({
                key: `${char}_run`,
                frames: Array.from({ length: 12 }, (_, i) => ({ key: `${char}_run_${i}` })),
                frameRate: 12,
                repeat: -1
            });
        });

        this.scene.start('GameScene');
    }
}
