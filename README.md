# Mofos Game

A browser-based MMORPG tactical turn-based game, inspired by Dofus.

## Tech Stack

*   **Frontend**: React + Vite + TypeScript
*   **Game Engine**: Phaser 3
*   **State Management**: Zustand
*   **Backend**: Node.js (Planned)

## Getting Started

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Run the development server:
    ```bash
    npm run dev
    ```

3.  Build for production:
    ```bash
    npm run build
    ```

## Project Structure

*   `src/components`: React UI components
*   `src/game`: Phaser game logic
    *   `src/game/scenes`: Phaser Scenes (Boot, Game, etc.)
*   `src/store`: Zustand state stores
*   `src/types`: TypeScript definitions
