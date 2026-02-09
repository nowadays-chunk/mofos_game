import React, { useRef, useState, useEffect } from 'react';
import { useUIStore } from '../../store/UIStore';

interface WindowProps {
    id: string;
    title: string;
    children: React.ReactNode;
    initialWidth?: number;
    initialHeight?: number;
    onClose?: () => void;
    resizable?: boolean;
}

export const Window: React.FC<WindowProps> = ({ id, title, children, initialWidth = 300, initialHeight = 200, onClose, resizable = true }) => {
    const { windows, focusWindow, closeWindow, moveWindow, resizeWindow } = useUIStore();
    const windowState = windows[id];

    // Local state for drag/resize offsets
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const windowRef = useRef<HTMLDivElement>(null);

    // Initialize window if not in store (optional, or rely on active openings)
    // For now, we assume it's open if this component is rendered, or we check state

    if (!windowState || !windowState.isOpen) return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only start drag if clicking the header and not a button
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;

        setIsDragging(true);
        setDragOffset({
            x: e.clientX - windowState.x,
            y: e.clientY - windowState.y
        });
        focusWindow(id);
    };

    const handleResizeDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: windowState.width || initialWidth,
            height: windowState.height || initialHeight
        });
        focusWindow(id);
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        closeWindow(id);
        if (onClose) onClose();
    };

    const handleContentClick = () => {
        focusWindow(id);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                moveWindow(id, e.clientX - dragOffset.x, e.clientY - dragOffset.y);
            } else if (isResizing) {
                const deltaX = e.clientX - resizeStart.x;
                const deltaY = e.clientY - resizeStart.y;
                resizeWindow(id, Math.max(200, resizeStart.width + deltaX), Math.max(100, resizeStart.height + deltaY));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragOffset, resizeStart, id, moveWindow, resizeWindow]);

    return (
        <div
            ref={windowRef}
            className="game-window"
            style={{
                position: 'absolute',
                left: windowState.x,
                top: windowState.y,
                width: windowState.width || initialWidth,
                height: windowState.height || initialHeight,
                zIndex: windowState.zIndex,
                backgroundColor: 'rgba(28, 28, 34, 0.95)', // Darker, more game-like
                border: '1px solid #5a5a6e', // Lighter border for contrast
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                overflow: 'hidden',
                pointerEvents: 'all'
            }}
            onMouseDown={handleContentClick}
        >
            {/* Header */}
            <div
                className="window-header"
                onMouseDown={handleMouseDown}
                style={{
                    padding: '8px 12px',
                    background: 'linear-gradient(to bottom, #3a3a4e, #2a2a3e)',
                    borderBottom: '1px solid #444',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'grab',
                    userSelect: 'none',
                    height: '36px'
                }}
            >
                <span style={{
                    fontWeight: 'bold',
                    color: '#e0e0e0',
                    fontSize: '14px',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
                }}>{title}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#aaa',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            padding: '0 4px',
                            lineHeight: '1'
                        }}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="window-content" style={{ flex: 1, padding: '10px', overflowY: 'auto', color: '#ccc', position: 'relative' }}>
                {children}
            </div>

            {/* Resize Handle */}
            {resizable && (
                <div
                    onMouseDown={handleResizeDown}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '15px',
                        height: '15px',
                        cursor: 'nwse-resize',
                        background: 'linear-gradient(135deg, transparent 50%, #666 50%)',
                        opacity: 0.5
                    }}
                />
            )}
        </div>
    );
};
