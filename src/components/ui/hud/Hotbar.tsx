import React from 'react';

export const Hotbar: React.FC = () => {
    const slots = 10; // 0-9

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '5px',
            padding: '10px',
            backgroundColor: 'rgba(20, 20, 30, 0.8)',
            borderRadius: '8px',
            border: '1px solid #444',
            pointerEvents: 'auto'
        }}>
            {Array.from({ length: slots }).map((_, i) => (
                <div key={i} style={{ position: 'relative' }}>
                    <div
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: '#222',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s',
                            color: '#555'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#888')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#555')}
                    >
                        {/* Placeholder Icon/Text */}
                        {i === 0 ? '🔥' : ''}
                    </div>
                    <div style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '4px',
                        fontSize: '10px',
                        color: '#aaa',
                        fontWeight: 'bold',
                        pointerEvents: 'none'
                    }}>
                        {i + 1 === 10 ? '0' : i + 1}
                    </div>
                </div>
            ))}
        </div>
    );
};
