export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

// Room-based map configuration
export const GRID_SIZE = 25; // Fixed 25x25 room
export const ROOM_MIN_X = -Math.floor(GRID_SIZE / 2);
export const ROOM_MAX_X = Math.floor(GRID_SIZE / 2);
export const ROOM_MIN_Y = -Math.floor(GRID_SIZE / 2);
export const ROOM_MAX_Y = Math.floor(GRID_SIZE / 2);

// Tile scaling: larger in center, smaller at edges
export const TILE_SCALE_CENTER = 1.0; // Full size at center
export const TILE_SCALE_EDGE = 0.4;   // 40% size at corners

// Legacy exports for compatibility (will be removed)
export let MAP_WIDTH = GRID_SIZE;
export let MAP_HEIGHT = GRID_SIZE;

// Function to update map dimensions (deprecated for infinite map)
export function setMapDimensions(width: number, height: number) {
    MAP_WIDTH = width;
    MAP_HEIGHT = height;
}

export const COLORS = {
    GRID_STROKE: 0xffffff,
    TILE_DEFAULT: 0x00aa00,
    TILE_HOVER: 0x66ff66,
    TILE_WALL: 0x888888,
    TILE_OBSTACLE: 0x555555,
    PATH: 0x0000ff,
    PATH_HIGHLIGHT: 0x006400 // Dark green
};

export const CHARACTERS = [
    'Bloody_Alchemist_1',
    'Bloody_Alchemist_2',
    'Bloody_Alchemist_3',
    'Fallen_Angels_1',
    'Fallen_Angels_2',
    'Fallen_Angels_3',
    'Zombie_Villager_1',
    'Zombie_Villager_2',
    'Zombie_Villager_3'
];

export const OBJECTS = {
    ROCKS: {
        path: 'design/objects/craftpix-net-974061-free-rocks-and-stones-top-down-pixel-art/PNG/Objects_separately',
        files: [
            'Rock1_1.png', 'Rock1_2.png', 'Rock1_3.png', 'Rock1_4.png', 'Rock1_5.png',
            'Rock2_1.png', 'Rock2_2.png', 'Rock2_3.png', 'Rock2_4.png', 'Rock2_5.png',
            'Rock3_1.png', 'Rock3_2.png', 'Rock3_3.png', 'Rock3_4.png', 'Rock3_5.png',
            'Rock4_1.png', 'Rock4_2.png', 'Rock4_3.png', 'Rock4_4.png', 'Rock4_5.png',
            'Rock5_1.png', 'Rock5_2.png', 'Rock5_3.png', 'Rock5_4.png', 'Rock5_5.png',
            'Rock6_1.png', 'Rock6_2.png', 'Rock6_3.png', 'Rock6_4.png', 'Rock6_5.png',
            'Rock7_1.png', 'Rock7_2.png', 'Rock7_3.png', 'Rock7_4.png', 'Rock7_5.png',
            'Rock8_1.png', 'Rock8_2.png', 'Rock8_3.png', 'Rock8_4.png', 'Rock8_5.png',
        ]
    },
    CRYSTALS: {
        path: 'design/objects/craftpix-net-106469-top-down-crystals-pixel-art/PNG/Assets',
        files: [
            'Black_crystal1.png', 'Blue_crystal1.png', 'Green_crystal1.png', 'Pink_crystal1.png', 'Red_crystal1.png', 'Violet_crystal1.png', 'White_crystal1.png', 'Yellow_crystal1.png'
        ]
    },
    BUSHES: {
        path: 'design/objects/craftpix-net-141354-free-top-down-bushes-pixel-art/PNG/Assets',
        files: [
            'Autumn_bush1.png', 'Bush_blue_flowers1.png', 'Bush_orange_flowers1.png', 'Bush_pink_flowers1.png', 'Bush_red_flowers1.png', 'Bush_simple1_1.png', 'Cactus1_1.png', 'Fern1_1.png', 'Snow_bush1.png'
        ]
    }
};
