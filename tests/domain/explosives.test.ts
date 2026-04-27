/**
 * Domain tests: Explosive blast zones
 *
 * Pure function under test:
 *   src/module/system/utilities/explosives.ts — computeBlastZone
 *
 * The blast-zone system divides the area around an explosion into 3 (or 4
 * with the explosive_zones setting) concentric rings. Zone 1 is closest to
 * the explosion; higher zones are further out. A target beyond all zone
 * boundaries is in zone maxZone + 1 (beyond reach of the explosion).
 */

import { describe, it, expect } from 'vitest';
import { computeBlastZone } from '../../src/module/system/utilities/explosives';

// Typical weapon: zone 1 ≤ 5 m, zone 2 ≤ 10 m, zone 3 ≤ 20 m
const RADII_3 = [5, 10, 20];

// Extended zone weapon: zone 4 ≤ 30 m added
const RADII_4 = [5, 10, 20, 30];

// ---------------------------------------------------------------------------
// 3-zone weapon (default, explosive_zones = false)
// ---------------------------------------------------------------------------

describe('computeBlastZone — 3 zones', () => {
    it('range 0 (at origin) → zone 1', () => {
        expect(computeBlastZone(0, RADII_3, 3)).toBe(1);
    });

    it('range exactly at zone 1 boundary → zone 1', () => {
        expect(computeBlastZone(5, RADII_3, 3)).toBe(1);
    });

    it('range just inside zone 2 → zone 2', () => {
        expect(computeBlastZone(6, RADII_3, 3)).toBe(2);
    });

    it('range exactly at zone 2 boundary → zone 2', () => {
        expect(computeBlastZone(10, RADII_3, 3)).toBe(2);
    });

    it('range just inside zone 3 → zone 3', () => {
        expect(computeBlastZone(11, RADII_3, 3)).toBe(3);
    });

    it('range exactly at zone 3 boundary → zone 3', () => {
        expect(computeBlastZone(20, RADII_3, 3)).toBe(3);
    });

    it('range beyond all zones → zone 4 (beyond reach)', () => {
        expect(computeBlastZone(21, RADII_3, 3)).toBe(4);
    });
});

// ---------------------------------------------------------------------------
// 4-zone weapon (explosive_zones = true)
// ---------------------------------------------------------------------------

describe('computeBlastZone — 4 zones', () => {
    it('range inside zone 1 → zone 1', () => {
        expect(computeBlastZone(3, RADII_4, 4)).toBe(1);
    });

    it('range in zone 3 → zone 3', () => {
        expect(computeBlastZone(15, RADII_4, 4)).toBe(3);
    });

    it('range exactly at zone 4 boundary → zone 4', () => {
        expect(computeBlastZone(30, RADII_4, 4)).toBe(4);
    });

    it('range beyond zone 4 → zone 5 (beyond reach)', () => {
        expect(computeBlastZone(31, RADII_4, 4)).toBe(5);
    });
});
