import React, { useEffect, useMemo, useState } from 'react';
import { gameEvents, EVENTS } from '../../game/GameEventBus';
import { useGameState } from '../../store/GameStore';
import { SpellIcon } from './SpellIcon';

const HOTBAR_STORAGE_KEY = 'mofos_hotbar';

export const Hotbar: React.FC = () => {
    const { player, combat } = useGameState();
    const [slots, setSlots] = useState<(string | null)[]>(Array(10).fill(null));
    const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);

    const playerBattleState = useMemo(
        () => combat.fighters.find((fighter) => fighter.id === 'player-main'),
        [combat.fighters]
    );
    const cooldowns = playerBattleState?.cooldowns ?? {};
    const isPlayersTurn = combat.isActive && combat.activeFighterId === 'player-main';

    useEffect(() => {
        const saved = localStorage.getItem(HOTBAR_STORAGE_KEY);
        if (saved) {
            try {
                setSlots(JSON.parse(saved));
                return;
            } catch (error) {
                console.error('Failed to load hotbar', error);
            }
        }

        setSlots((current) => {
            if (current.some((slot) => slot !== null)) {
                return current;
            }
            return Array.from({ length: 10 }, (_, index) => player.spells[index]?.id ?? null);
        });
    }, [player.spells]);

    useEffect(() => {
        const onSpellSelected = (spellId: string | null) => {
            setSelectedSpellId(spellId);
        };

        gameEvents.on(EVENTS.COMBAT.SPELL_SELECTED, onSpellSelected);
        return () => {
            gameEvents.off(EVENTS.COMBAT.SPELL_SELECTED, onSpellSelected);
        };
    }, []);

    useEffect(() => {
        if (!combat.isActive) {
            setSelectedSpellId(null);
        }
    }, [combat.isActive]);

    const saveSlots = (nextSlots: (string | null)[]) => {
        setSlots(nextSlots);
        localStorage.setItem(HOTBAR_STORAGE_KEY, JSON.stringify(nextSlots));
    };

    const handleDrop = (event: React.DragEvent, index: number) => {
        event.preventDefault();
        const spellId = event.dataTransfer.getData('spellId');
        if (!spellId) {
            return;
        }

        const spell = player.spells.find((entry) => entry.id === spellId);
        if (!spell) {
            return;
        }

        const nextSlots = [...slots];
        nextSlots[index] = spellId;
        saveSlots(nextSlots);
    };

    const handleSlotClick = (spellId: string | null) => {
        if (!spellId || !combat.isActive) {
            return;
        }

        const spell = player.spells.find((entry) => entry.id === spellId);
        if (!spell) {
            return;
        }

        const currentCooldown = cooldowns[spellId] ?? 0;
        if (!isPlayersTurn || currentCooldown > 0 || (playerBattleState?.ap ?? player.ap) < spell.apCost) {
            return;
        }

        const nextSpellId = selectedSpellId === spellId ? null : spellId;
        setSelectedSpellId(nextSpellId);
        gameEvents.emit(EVENTS.COMBAT.SPELL_SELECTED, nextSpellId);
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid #4a5568',
            zIndex: 900,
            pointerEvents: 'auto'
        }}>
            {slots.map((spellId, index) => {
                const spell = spellId ? player.spells.find((entry) => entry.id === spellId) : null;
                const isSelected = selectedSpellId === spellId;
                const cooldown = spellId ? cooldowns[spellId] ?? 0 : 0;
                const disabled = Boolean(
                    combat.isActive && spell && (!isPlayersTurn || cooldown > 0 || (playerBattleState?.ap ?? player.ap) < spell.apCost)
                );

                return (
                    <div
                        key={index}
                        style={{
                            width: '44px',
                            height: '44px',
                            backgroundColor: isSelected ? '#4a5568' : '#1a202c',
                            border: isSelected ? '2px solid #63b3ed' : '1px solid #2d3748',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            cursor: spell ? 'pointer' : 'default',
                            opacity: disabled ? 0.6 : 1
                        }}
                        onDrop={(event) => handleDrop(event, index)}
                        onDragOver={(event) => event.preventDefault()}
                        onClick={() => handleSlotClick(spellId)}
                    >
                        {spell ? (
                            <SpellIcon
                                spell={spell}
                                isDraggable={true}
                                onDragStart={(event) => event.dataTransfer.setData('spellId', spell.id)}
                                disabled={disabled}
                                cooldown={cooldown}
                            />
                        ) : (
                            <span style={{ fontSize: '10px', color: '#4a5568' }}>{index + 1 > 9 ? 0 : index + 1}</span>
                        )}
                        <div style={{ position: 'absolute', top: 1, left: 2, fontSize: '8px', color: '#718096' }}>
                            {index + 1 > 9 ? 0 : index + 1}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
