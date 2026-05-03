/**
 * Pure helper extracted from roll-setup.ts: maps a measured distance to the
 * matching range band and (optionally) difficulty level. No Foundry globals.
 */

export interface RangeBuckets {
    short: number;
    medium: number;
    long: number;
}

export interface RangeBucketResult {
    range: string;
    difficultyLevel: string;
    outOfRange: boolean;
}

const POINT_BLANK_THRESHOLD = 3;

export function bucketDistance(distance: number, buckets: RangeBuckets): RangeBucketResult {
    if (distance < POINT_BLANK_THRESHOLD) {
        return { range: 'OD6S.RANGE_POINT_BLANK_SHORT', difficultyLevel: 'OD6S.DIFFICULTY_VERY_EASY', outOfRange: false };
    }
    if (distance <= buckets.short) {
        return { range: 'OD6S.RANGE_SHORT_SHORT', difficultyLevel: 'OD6S.DIFFICULTY_EASY', outOfRange: false };
    }
    if (distance <= buckets.medium) {
        return { range: 'OD6S.RANGE_MEDIUM_SHORT', difficultyLevel: 'OD6S.DIFFICULTY_MODERATE', outOfRange: false };
    }
    if (distance <= buckets.long) {
        return { range: 'OD6S.RANGE_LONG_SHORT', difficultyLevel: 'OD6S.DIFFICULTY_DIFFICULT', outOfRange: false };
    }
    return { range: 'OD6S.RANGE_SHORT_SHORT', difficultyLevel: 'OD6S.DIFFICULTY_EASY', outOfRange: true };
}
