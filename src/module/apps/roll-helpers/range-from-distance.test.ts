import { describe, it, expect } from 'vitest';
import { bucketDistance, type RangeBuckets } from './range-from-distance';

const buckets: RangeBuckets = { short: 10, medium: 30, long: 100 };

describe('bucketDistance', () => {
    it('returns point-blank for distance below 3', () => {
        expect(bucketDistance(0, buckets)).toEqual({
            range: 'OD6S.RANGE_POINT_BLANK_SHORT',
            difficultyLevel: 'OD6S.DIFFICULTY_VERY_EASY',
            outOfRange: false,
        });
        expect(bucketDistance(2, buckets).range).toBe('OD6S.RANGE_POINT_BLANK_SHORT');
    });

    it('returns short at the lower edge of short range (3)', () => {
        const result = bucketDistance(3, buckets);
        expect(result.range).toBe('OD6S.RANGE_SHORT_SHORT');
        expect(result.difficultyLevel).toBe('OD6S.DIFFICULTY_EASY');
        expect(result.outOfRange).toBe(false);
    });

    it('returns short up to and including buckets.short', () => {
        expect(bucketDistance(10, buckets).range).toBe('OD6S.RANGE_SHORT_SHORT');
    });

    it('returns medium just above short', () => {
        const result = bucketDistance(11, buckets);
        expect(result.range).toBe('OD6S.RANGE_MEDIUM_SHORT');
        expect(result.difficultyLevel).toBe('OD6S.DIFFICULTY_MODERATE');
    });

    it('returns medium up to and including buckets.medium', () => {
        expect(bucketDistance(30, buckets).range).toBe('OD6S.RANGE_MEDIUM_SHORT');
    });

    it('returns long just above medium', () => {
        const result = bucketDistance(31, buckets);
        expect(result.range).toBe('OD6S.RANGE_LONG_SHORT');
        expect(result.difficultyLevel).toBe('OD6S.DIFFICULTY_DIFFICULT');
    });

    it('returns long up to and including buckets.long', () => {
        expect(bucketDistance(100, buckets).range).toBe('OD6S.RANGE_LONG_SHORT');
    });

    it('flags out-of-range above buckets.long', () => {
        const result = bucketDistance(101, buckets);
        expect(result.outOfRange).toBe(true);
    });
});
