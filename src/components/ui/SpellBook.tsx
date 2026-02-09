import React from 'react';
import { useGameState } from '../../store/GameStore';
import { SpellIcon } from './SpellIcon';

export const SpellBook: React.FC = () => {
    const { player } = useGameState();

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            padding: '8px',
            overflowY: 'auto',
            maxHeight: '350px'
        }}>
            {player.spells.map(spell => (
                <div key={spell.id} title={spell.name}>
                    <SpellIcon
                        spell={spell}
                        isDraggable={true}
                        onDragStart={(e, s) => {
                            e.dataTransfer.setData('spellId', s.id);
                        }}
                    />
                </div>
            ))}
            {player.spells.length === 0 && (
                <div style={{ gridColumn: '1 / -1', color: '#a0aec0', textAlign: 'center', marginTop: '20px' }}>
                    No spells learned yet.
                </div>
            )}
        </div>
    );
};
