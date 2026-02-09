import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { GameScene } from './game/scenes/GameScene';
import './App.css';

function App() {
    const gameRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (gameRef.current) {
            // Basic Phaser Game Config
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: window.innerWidth,
                height: window.innerHeight,
                parent: gameRef.current,
                scene: [BootScene, GameScene],
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { x: 0, y: 0 },
                        debug: false
                    }
                },
                scale: {
                    mode: Phaser.Scale.RESIZE,
                    autoCenter: Phaser.Scale.CENTER_BOTH
                }
            };

            const game = new Phaser.Game(config);

            return () => {
                game.destroy(true);
            };
        }
    }, []);

    return (
        <div className="App">
            <h1>Mofos Game</h1>
            <div ref={gameRef} id="phaser-game" />
        </div>
    );
}

export default App;
