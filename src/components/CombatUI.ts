import Phaser from 'phaser';
import { CombatParticipant } from '../game/systems/CombatSystem';
import { Spell } from '../game/data/Courants';

export class CombatUI {
    scene: Phaser.Scene;
    container: Phaser.GameObjects.Container;

    // UI Elements
    playerHpBar!: Phaser.GameObjects.Graphics;
    opponentHpBar!: Phaser.GameObjects.Graphics;
    playerHpText!: Phaser.GameObjects.Text;
    opponentHpText!: Phaser.GameObjects.Text;
    playerApText!: Phaser.GameObjects.Text;
    opponentApText!: Phaser.GameObjects.Text;
    playerCourantText!: Phaser.GameObjects.Text;
    opponentCourantText!: Phaser.GameObjects.Text;
    turnIndicator!: Phaser.GameObjects.Text;
    spellButtons: Phaser.GameObjects.Container[] = [];
    endTurnButton!: Phaser.GameObjects.Container;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.container = scene.add.container(0, 0);
        this.container.setScrollFactor(0);
        this.container.setDepth(100); // Lower depth to not completely block sprites
        this.container.setVisible(false);
    }

    show(player: CombatParticipant, opponent: CombatParticipant) {
        this.container.removeAll(true);
        this.spellButtons = [];

        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.5); // Less opaque so we can see sprites
        bg.fillRect(0, 0, width, height);
        this.container.add(bg);

        // Combat panel
        const panelWidth = 600;
        const panelHeight = 500;
        const panelX = (width - panelWidth) / 2;
        const panelY = (height - panelHeight) / 2;

        const panel = this.scene.add.graphics();
        panel.fillStyle(0x1a1a2e, 1);
        panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);
        panel.lineStyle(2, 0xffffff, 1);
        panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);
        this.container.add(panel);

        // Title
        const title = this.scene.add.text(width / 2, panelY + 20, 'COMBAT', {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.container.add(title);

        // Player info (left side)
        const playerX = panelX + 50;
        const playerY = panelY + 80;

        this.playerCourantText = this.scene.add.text(playerX, playerY, `You: ${player.entity.courant}`, {
            fontSize: '18px',
            color: '#4CAF50',
            fontStyle: 'bold'
        });
        this.container.add(this.playerCourantText);

        this.playerHpText = this.scene.add.text(playerX, playerY + 30, `HP: ${player.hp}/${player.maxHp}`, {
            fontSize: '16px',
            color: '#ffffff'
        });
        this.container.add(this.playerHpText);

        this.playerHpBar = this.scene.add.graphics();
        this.updateHpBar(this.playerHpBar, playerX, playerY + 55, 200, player.hp, player.maxHp, 0x4CAF50);
        this.container.add(this.playerHpBar);

        this.playerApText = this.scene.add.text(playerX, playerY + 75, `AP: ${player.ap}/${player.maxAp}`, {
            fontSize: '16px',
            color: '#2196F3'
        });
        this.container.add(this.playerApText);

        // Opponent info (right side)
        const opponentX = panelX + panelWidth - 250;
        const opponentY = panelY + 80;

        this.opponentCourantText = this.scene.add.text(opponentX, opponentY, `Opponent: ${opponent.entity.courant}`, {
            fontSize: '18px',
            color: '#f44336',
            fontStyle: 'bold'
        });
        this.container.add(this.opponentCourantText);

        this.opponentHpText = this.scene.add.text(opponentX, opponentY + 30, `HP: ${opponent.hp}/${opponent.maxHp}`, {
            fontSize: '16px',
            color: '#ffffff'
        });
        this.container.add(this.opponentHpText);

        this.opponentHpBar = this.scene.add.graphics();
        this.updateHpBar(this.opponentHpBar, opponentX, opponentY + 55, 200, opponent.hp, opponent.maxHp, 0xf44336);
        this.container.add(this.opponentHpBar);

        this.opponentApText = this.scene.add.text(opponentX, opponentY + 75, `AP: ${opponent.ap}/${opponent.maxAp}`, {
            fontSize: '16px',
            color: '#2196F3'
        });
        this.container.add(this.opponentApText);

        // Turn indicator
        this.turnIndicator = this.scene.add.text(width / 2, panelY + 180, 'Your Turn', {
            fontSize: '24px',
            color: '#FFD700',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.container.add(this.turnIndicator);

        // Spell buttons (show first 4 spells)
        const spellsToShow = player.entity.spells.slice(0, 4);
        const buttonStartY = panelY + 220;
        const buttonSpacing = 60;

        spellsToShow.forEach((spell, index) => {
            const button = this.createSpellButton(
                panelX + 50,
                buttonStartY + index * buttonSpacing,
                500,
                50,
                spell
            );
            this.container.add(button);
            this.spellButtons.push(button);
        });

        // End Turn button
        this.endTurnButton = this.createEndTurnButton(
            width / 2 - 75,
            panelY + panelHeight - 60,
            150,
            40
        );
        this.container.add(this.endTurnButton);

        this.container.setVisible(true);
    }

    private createSpellButton(x: number, y: number, width: number, height: number, spell: Spell): Phaser.GameObjects.Container {
        const container = this.scene.add.container(x, y);

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x2196F3, 1);
        bg.fillRoundedRect(0, 0, width, height, 5);
        bg.lineStyle(2, 0xffffff, 1);
        bg.strokeRoundedRect(0, 0, width, height, 5);
        container.add(bg);

        const nameText = this.scene.add.text(10, 10, spell.name, {
            fontSize: '16px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        container.add(nameText);

        const costText = this.scene.add.text(width - 60, 10, `AP: ${spell.apCost || 3}`, {
            fontSize: '14px',
            color: '#FFD700'
        });
        container.add(costText);

        const descText = this.scene.add.text(10, 30, spell.description.substring(0, 50) + '...', {
            fontSize: '12px',
            color: '#cccccc'
        });
        container.add(descText);

        // Make interactive
        bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
        bg.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x1976D2, 1);
            bg.fillRoundedRect(0, 0, width, height, 5);
            bg.lineStyle(2, 0xFFD700, 1);
            bg.strokeRoundedRect(0, 0, width, height, 5);
        });
        bg.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x2196F3, 1);
            bg.fillRoundedRect(0, 0, width, height, 5);
            bg.lineStyle(2, 0xffffff, 1);
            bg.strokeRoundedRect(0, 0, width, height, 5);
        });
        bg.on('pointerdown', () => {
            this.scene.events.emit('spell-selected', spell);
        });

        return container;
    }

    private createEndTurnButton(x: number, y: number, width: number, height: number): Phaser.GameObjects.Container {
        const container = this.scene.add.container(x, y);

        const bg = this.scene.add.graphics();
        bg.fillStyle(0xFF9800, 1);
        bg.fillRoundedRect(0, 0, width, height, 5);
        bg.lineStyle(2, 0xffffff, 1);
        bg.strokeRoundedRect(0, 0, width, height, 5);
        container.add(bg);

        const text = this.scene.add.text(width / 2, height / 2, 'End Turn', {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(text);

        // Make interactive
        bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
        bg.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0xF57C00, 1);
            bg.fillRoundedRect(0, 0, width, height, 5);
            bg.lineStyle(2, 0xFFD700, 1);
            bg.strokeRoundedRect(0, 0, width, height, 5);
        });
        bg.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0xFF9800, 1);
            bg.fillRoundedRect(0, 0, width, height, 5);
            bg.lineStyle(2, 0xffffff, 1);
            bg.strokeRoundedRect(0, 0, width, height, 5);
        });
        bg.on('pointerdown', () => {
            this.scene.events.emit('end-turn');
        });

        return container;
    }

    private updateHpBar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, hp: number, maxHp: number, color: number) {
        graphics.clear();
        graphics.fillStyle(0x333333, 1);
        graphics.fillRect(x, y, width, 15);
        graphics.fillStyle(color, 1);
        graphics.fillRect(x, y, (hp / maxHp) * width, 15);
        graphics.lineStyle(1, 0xffffff, 1);
        graphics.strokeRect(x, y, width, 15);
    }

    update(player: CombatParticipant, opponent: CombatParticipant, currentTurn: 'player' | 'opponent') {
        // Update HP bars and texts
        this.playerHpText.setText(`HP: ${player.hp}/${player.maxHp}`);
        this.opponentHpText.setText(`HP: ${opponent.hp}/${opponent.maxHp}`);
        this.playerApText.setText(`AP: ${player.ap}/${player.maxAp}`);
        this.opponentApText.setText(`AP: ${opponent.ap}/${opponent.maxAp}`);

        const playerX = parseInt(this.playerHpBar.x as any) || 0;
        const playerY = parseInt(this.playerHpBar.y as any) || 0;
        const opponentX = parseInt(this.opponentHpBar.x as any) || 0;
        const opponentY = parseInt(this.opponentHpBar.y as any) || 0;

        this.updateHpBar(this.playerHpBar, playerX, playerY, 200, player.hp, player.maxHp, 0x4CAF50);
        this.updateHpBar(this.opponentHpBar, opponentX, opponentY, 200, opponent.hp, opponent.maxHp, 0xf44336);

        // Update turn indicator
        this.turnIndicator.setText(currentTurn === 'player' ? 'Your Turn' : 'Opponent\'s Turn');
        this.turnIndicator.setColor(currentTurn === 'player' ? '#FFD700' : '#FF6B6B');

        // Enable/disable spell buttons based on turn and AP
        this.spellButtons.forEach(button => {
            button.setAlpha(currentTurn === 'player' ? 1 : 0.5);
        });
        this.endTurnButton.setAlpha(currentTurn === 'player' ? 1 : 0.5);
    }

    hide() {
        this.container.setVisible(false);
    }

    destroy() {
        this.container.destroy();
    }
}
