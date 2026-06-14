/**
 * Pure wound/damage state-transition logic. No Foundry globals.
 * Extracted so tests can import without dragging in Roll/Dialog/etc.
 */

export interface DeadlinessRow {
    core: string;
    description?: string;
    penalty?: number;
}

/**
 * Find the first wound level (key) in a deadliness table whose core matches.
 * Returns undefined if no match.
 */
export function findWoundLevelByCore(
    table: Record<string, DeadlinessRow>,
    core: string,
): string | undefined {
    for (const level in table) {
        if (table[level].core === core) return level;
    }
    return undefined;
}

/**
 * Compute the new vehicle/starship damage state given current state and incoming damage.
 * Preserves an undefined return for (DESTROYED, anything-other-than-DESTROYED) — historic behavior.
 */
export function computeNewDamageLevel(currentDamageLevel: string, damage: string): string | undefined {
    if (damage === 'NONEX_IST_OD6S.DAMAGE_DESTROYED') return damage;
    if (currentDamageLevel === 'NONEX_IST_OD6S.NO_DAMAGE') return damage;
    if (currentDamageLevel === 'NONEX_IST_OD6S.DAMAGE_VERY_LIGHT') return damage;
    if (currentDamageLevel === 'NONEX_IST_OD6S.DAMAGE_LIGHT') {
        if (damage === 'NONEX_IST_OD6S.DAMAGE_VERY_LIGHT') return currentDamageLevel;
        return damage;
    }
    if (currentDamageLevel === 'NONEX_IST_OD6S.DAMAGE_HEAVY') {
        if (damage === 'NONEX_IST_OD6S.DAMAGE_VERY_LIGHT') return currentDamageLevel;
        if (damage === 'NONEX_IST_OD6S.DAMAGE_LIGHT') return 'NONEX_IST_OD6S.DAMAGE_SEVERE';
        if (damage === 'NONEX_IST_OD6S.DAMAGE_HEAVY') return 'NONEX_IST_OD6S.DAMAGE_SEVERE';
        return damage;
    }
    if (currentDamageLevel === 'NONEX_IST_OD6S.DAMAGE_SEVERE') {
        if (damage === 'NONEX_IST_OD6S.DAMAGE_VERY_LIGHT') return currentDamageLevel;
        if (damage === 'NONEX_IST_OD6S.DAMAGE_LIGHT') return 'NONEX_IST_OD6S.DAMAGE_DESTROYED';
        if (damage === 'NONEX_IST_OD6S.DAMAGE_HEAVY') return 'NONEX_IST_OD6S.DAMAGE_DESTROYED';
        if (damage === 'NONEX_IST_OD6S.DAMAGE_SEVERE') return 'NONEX_IST_OD6S.DAMAGE_DESTROYED';
    }
    return undefined;
}

/**
 * Compute the new wound-table key given current wound key, incoming wound core,
 * the deadliness table, and the stun-as-damage rule flag.
 */
export function computeNewWoundLevel(
    currentWoundValue: string | number,
    incomingWound: string,
    deadlinessTable: Record<string, DeadlinessRow>,
    stunDamageIncrement: boolean,
): string | number | undefined {
    const currentWoundCore = deadlinessTable[currentWoundValue as string]?.core;
    let wound = incomingWound;

    if (wound === 'NONEX_IST_OD6S.WOUNDS_DEAD') return findWoundLevelByCore(deadlinessTable, wound);
    if (wound === 'NONEX_IST_OD6S.WOUNDS_STUNNED' && !findWoundLevelByCore(deadlinessTable, wound)) {
        wound = 'NONEX_IST_OD6S.WOUNDS_WOUNDED';
    }
    if (wound === 'NONEX_IST_OD6S.WOUNDS_INCAPACITATED' && !findWoundLevelByCore(deadlinessTable, wound)) {
        wound = 'NONEX_IST_OD6S.WOUNDS_MORTALLY_WOUNDED';
    }

    if (currentWoundCore === 'NONEX_IST_OD6S.WOUNDS_HEALTHY') {
        return findWoundLevelByCore(deadlinessTable, wound);
    }
    if (currentWoundCore === 'NONEX_IST_OD6S.WOUNDS_STUNNED') {
        return stunDamageIncrement
            ? (+currentWoundValue) + 1
            : findWoundLevelByCore(deadlinessTable, wound);
    }
    if (currentWoundCore === 'NONEX_IST_OD6S.WOUNDS_WOUNDED') {
        if (!stunDamageIncrement && wound === 'NONEX_IST_OD6S.WOUNDS_STUNNED') return currentWoundValue;
        if (wound === 'NONEX_IST_OD6S.WOUNDS_STUNNED') return (+currentWoundValue) + 1;
        if (wound === 'NONEX_IST_OD6S.WOUNDS_WOUNDED') return (+currentWoundValue) + 1;
        return findWoundLevelByCore(deadlinessTable, wound);
    }
    if (currentWoundCore === 'NONEX_IST_OD6S.WOUNDS_SEVERELY_WOUNDED') {
        if (!stunDamageIncrement && wound === 'NONEX_IST_OD6S.WOUNDS_STUNNED') return currentWoundValue;
        if (wound === 'NONEX_IST_OD6S.WOUNDS_STUNNED') return (+currentWoundValue) + 1;
        if (wound === 'NONEX_IST_OD6S.WOUNDS_WOUNDED') return (+currentWoundValue) + 1;
        if (wound === 'NONEX_IST_OD6S.WOUNDS_SEVERELY_WOUNDED') return (+currentWoundValue) + 1;
        return findWoundLevelByCore(deadlinessTable, wound);
    }
    if (currentWoundCore === 'NONEX_IST_OD6S.WOUNDS_INCAPACITATED') {
        if (!stunDamageIncrement && wound === 'NONEX_IST_OD6S.WOUNDS_STUNNED') return currentWoundValue;
        if (wound === 'NONEX_IST_OD6S.WOUNDS_STUNNED') return (+currentWoundValue) + 1;
        if (wound === 'NONEX_IST_OD6S.WOUNDS_WOUNDED') return (+currentWoundValue) + 1;
        if (wound === 'NONEX_IST_OD6S.WOUNDS_SEVERELY_WOUNDED') return (+currentWoundValue) + 1;
        if (wound === 'NONEX_IST_OD6S.WOUNDS_INCAPACITATED') return (+currentWoundValue) + 1;
        return findWoundLevelByCore(deadlinessTable, wound);
    }
    if (currentWoundCore === 'NONEX_IST_OD6S.WOUNDS_MORTALLY_WOUNDED') {
        if (!stunDamageIncrement) {
            if (wound === 'NONEX_IST_OD6S.WOUNDS_STUNNED') return currentWoundValue;
            if (wound === 'NONEX_IST_OD6S.WOUNDS_WOUNDED') return currentWoundValue;
            if (wound === 'NONEX_IST_OD6S.WOUNDS_SEVERELY_WOUNDED') return currentWoundValue;
        }
        if (wound === 'NONEX_IST_OD6S.WOUNDS_STUNNED') return (+currentWoundValue) + 1;
        if (wound === 'NONEX_IST_OD6S.WOUNDS_WOUNDED') return (+currentWoundValue) + 1;
        if (wound === 'NONEX_IST_OD6S.WOUNDS_SEVERELY_WOUNDED') return (+currentWoundValue) + 1;
        if (wound === 'NONEX_IST_OD6S.WOUNDS_INCAPACITATED') return (+currentWoundValue) + 1;
        if (wound === 'NONEX_IST_OD6S.WOUNDS_MORTALLY_WOUNDED') return (+currentWoundValue) + 1;
        return findWoundLevelByCore(deadlinessTable, wound);
    }
    return undefined;
}
