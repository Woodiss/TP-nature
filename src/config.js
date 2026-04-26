import { PROFILE } from './core/DeviceProfile.js';

const PRESETS = {
    high: {
        terrainSize:      128,
        terrainSegments:  250,
        treeCount:        150,
        bushCount:        100,
        flowersPerType:   100,
        grassCount:       100000,
        leafCount:        500,
        shadowMapSize:    2048,
        maxPixelRatio:    2,
        bloomStrength:    0.15,
        bloomResScale:    1.0,   // résolution du bloom (1 = full, 0.5 = half)
        waterIter:        5,
        antialias:        true,
        shadows:          true,
        shadowType:       'pcfsoft', // 'pcfsoft' | 'pcf' | 'basic'
    },
    medium: {
        terrainSize:      128,
        terrainSegments:  128,
        treeCount:        100,
        bushCount:        60,
        flowersPerType:   60,
        grassCount:       40000,
        leafCount:        200,
        shadowMapSize:    1024,
        maxPixelRatio:    1.5,
        bloomStrength:    0.12,
        bloomResScale:    0.75,
        waterIter:        4,
        antialias:        true,
        shadows:          true,
        shadowType:       'pcf',
    },
    low: {
        terrainSize:      128,
        terrainSegments:  64,
        treeCount:        60,
        bushCount:        40,
        flowersPerType:   40,
        grassCount:       15000,
        leafCount:        80,
        shadowMapSize:    512,
        maxPixelRatio:    1,
        bloomStrength:    0.10,
        bloomResScale:    0.5,
        waterIter:        3,
        antialias:        false, // inutile sur écrans haute densité mobile
        shadows:          false, // gain majeur sur mobile
        shadowType:       'basic',
    },
};

export const CONFIG = PRESETS[PROFILE];
