import React, { useState } from 'react';
import { Spell } from '../../game/data/Courants';
import { SpellTooltip } from './SpellTooltip';

interface SpellIconProps {
    spell: Spell;
    isDraggable?: boolean;
    onDragStart?: (e: React.DragEvent, spell: Spell) => void;
    onClick?: () => void;
    disabled?: boolean; // e.g. not enough AP
    cooldown?: number; // Turns remaining
}

export const SpellIcon: React.FC<SpellIconProps> = ({ spell, isDraggable, onDragStart, onClick, disabled, cooldown }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleDragStart = (e: React.DragEvent) => {
        if (onDragStart) {
            onDragStart(e, spell);
        }
    };

    return (
        <>
            <div
                style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#2d3748',
                    border: '2px solid #4a5568',
                    borderRadius: '4px',
                    position: 'relative',
                    cursor: isDraggable || onClick ? 'pointer' : 'default',
                    opacity: disabled ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: spell.icon ? `url(/assets/spells/${spell.icon}.png)` : 'none', // Placeholder path
                    backgroundSize: 'cover'
                }}
                draggable={isDraggable}
                onDragStart={handleDragStart}
                onClick={onClick}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onMouseMove={handleMouseMove}
            >
                {/* Fallback text if no icon */}
                {!spell.icon || spell.icon === 'spell_default' ? (
                    <span style={{ fontSize: '10px', textAlign: 'center', color: 'white' }}>
                        {spell.name.substring(0, 2)}
                    </span>
                ) : null}

                {/* Cooldown Overlay */}
                {cooldown && cooldown > 0 ? (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '18px'
                    }}>
                        {cooldown}
                    </div>
                ) : null}

                {/* AP Cost Badge */}
                <div style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    backgroundColor: '#3182ce',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '10px',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid white'
                }}>
                    {spell.apCost}
                </div>
            </div>

            <SpellTooltip
                spell={spell}
                visible={showTooltip}
                x={mousePos.x}
                y={mousePos.y}
            />
        </>
    );
};
