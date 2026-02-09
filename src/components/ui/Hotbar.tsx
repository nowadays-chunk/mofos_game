import React, { useState, useEffect } from 'react';
import { useGameState } from '../../store/GameStore';
import { SpellIcon } from './SpellIcon';
import { gameEvents, EVENTS } from '../../game/GameEventBus';

// Local storage key for hotbar persistence (optional, can just use state for now)
const HOTBAR_STORAGE_KEY = 'mofos_hotbar';

export const Hotbar: React.FC = () => {
    const { player } = useGameState();
    const [slots, setSlots] = useState<(string | null)[]>(Array(10).fill(null));
    const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);

    // Load hotbar from local storage or default
    useEffect(() => {
        const saved = localStorage.getItem(HOTBAR_STORAGE_KEY);
        if (saved) {
            try {
                setSlots(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load hotbar", e);
            }
        }
    }, []);

    const saveSlots = (newSlots: (string | null)[]) => {
        setSlots(newSlots);
        localStorage.setItem(HOTBAR_STORAGE_KEY, JSON.stringify(newSlots));
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        const spellId = e.dataTransfer.getData('spellId');
        if (spellId) {
            // Check if spell exists in player's spellbook
            const spell = player.spells.find(s => s.id === spellId);
            if (spell) {
                const newSlots = [...slots];
                // Remove if already in another slot? Standard mmo behavior is to allow copy or move. 
                // Let's just overwrite for now.
                newSlots[index] = spellId;
                saveSlots(newSlots);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleSlotClick = (spellId: string | null) => {
        if (!spellId) return;

        if (selectedSpellId === spellId) {
            // Deselect
            setSelectedSpellId(null);
            gameEvents.emit(EVENTS.COMBAT.SPELL_SELECTED, null);
        } else {
            // Select
            setSelectedSpellId(spellId);
            gameEvents.emit(EVENTS.COMBAT.SPELL_SELECTED, spellId);
        }
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid #4a5568',
            zIndex: 900 // Below windows context menu
        }}>
            {slots.map((spellId, index) => {
                const spell = spellId ? player.spells.find(s => s.id === spellId) : null;
                const isSelected = selectedSpellId === spellId;

                return (
                    <div
                        key={index}
                        style={{
                            width: '44px',
                            height: '44px',
                            backgroundColor: isSelected ? '#4a5568' : '#1a202c', // Highlight seleciton
                            border: isSelected ? '2px solid #63b3ed' : '1px solid #2d3748',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            cursor: 'pointer'
                        }}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragOver={handleDragOver}
                        onClick={() => handleSlotClick(spellId)}
                    >
                        {spell ? (
                            <SpellIcon
                                spell={spell}
                                isDraggable={true}
                                onDragStart={(e) => e.dataTransfer.setData('spellId', spell.id)}
                            />
                        ) : (
                            <span style={{ fontSize: '10px', color: '#4a5568' }}>{index + 1 > 9 ? 0 : index + 1}</span>
                        )}
                        {/* Keybind overlay */}
                        <div style={{ position: 'absolute', top: 1, left: 2, fontSize: '8px', color: '#718096' }}>
                            {index + 1 > 9 ? 0 : index + 1}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
