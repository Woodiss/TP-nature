import { createNoise2D } from 'simplex-noise';

function mulberry32(a) {
    return function () {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export let myRandom = mulberry32(42);
export let noise2D  = createNoise2D(myRandom);

export function resetSeed(seed) {
    myRandom = mulberry32(seed);
    noise2D  = createNoise2D(myRandom);
}
