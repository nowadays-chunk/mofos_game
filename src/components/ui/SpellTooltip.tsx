import React from 'react';
import { Spell, SpellEffectType } from '../../game/data/Courants';

interface SpellTooltipProps {
    spell: Spell;
    visible: boolean;
    x: number;
    y: number;
}

export const SpellTooltip: React.FC<SpellTooltipProps> = ({ spell, visible, x, y }) => {
    if (!visible) return null;

    return (
        <div style={{
            position: 'absolute',
            left: x + 15,
            top: y + 15,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid #4a5568',
            borderRadius: '4px',
            padding: '8px',
            color: 'white',
            zIndex: 1000,
            maxWidth: '250px',
            pointerEvents: 'none',
            fontSize: '12px'
        }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: '#63b3ed' }}>
                {spell.name}
            </div>

            <div style={{ marginBottom: '8px', fontStyle: 'italic', color: '#a0aec0' }}>
                {spell.description}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px' }}>
                <div>AP: <span style={{ color: '#63b3ed' }}>{spell.apCost}</span></div>
                <div>Range: <span style={{ color: '#48bb78' }}>{spell.range.min}-{spell.range.max}</span></div>
                <div>Crit: <span style={{ color: '#ed8936' }}>15%</span></div>{/* Placeholder */}
                <div>CD: <span style={{ color: '#f56565' }}>{spell.constraints.cooldown || '-'}</span></div>
            </div>

            <div style={{ borderTop: '1px solid #4a5568', paddingTop: '4px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Effects:</div>
                {spell.effects.map((effect, idx) => (
                    <div key={idx} style={{ paddingLeft: '4px' }}>
                        {effect.type === SpellEffectType.DAMAGE && (
                            <span style={{ color: '#f56565' }}>Damage: {effect.min}-{effect.max}</span>
                        )}
                        {effect.type === SpellEffectType.HEAL && (
                            <span style={{ color: '#48bb78' }}>Heals: {effect.min}-{effect.max}</span>
                        )}
                        {effect.type === SpellEffectType.BUFF_AP && (
                            <span style={{ color: '#63b3ed' }}>+{effect.min} AP</span>
                        )}
                        {/* Add more effect renderers */}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '8px', fontSize: '10px', color: '#718096' }}>
                {spell.constraints.lineOfSight ? 'Line of Sight Required' : 'No Line of Sight'}
                {spell.aoe.shape !== 'single' && ` • AoE: ${spell.aoe.shape} (${spell.aoe.size})`}
            </div>
        </div>
    );
};
