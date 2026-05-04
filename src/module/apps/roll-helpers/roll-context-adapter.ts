/**
 * Boundary projection: Foundry documents/settings → narrowed handler views.
 *
 * This is the only file in the rules pipeline that knows about Foundry
 * types. Handlers consume the {@link HandlerContext} produced here; they
 * never reach back for the source documents. Keeping the projection
 * collected in one file makes the trust boundary auditable and the
 * handlers fully unit-testable.
 *
 * Each `adapt*` function is pure given its inputs — Foundry-shaped, but
 * mockable as plain objects. Tests construct fake actors/items by shape;
 * `game.*` access lives in the orchestrator that calls these.
 */

import type {
    ActorView,
    HandlerContext,
    ItemView,
    RollSettingsView,
    TargetView,
} from './roll-handlers';
import type { Localize } from './roll-data';

/**
 * Settings values the rules pipeline depends on. The orchestrator reads
 * these from `game.settings` / `OD6S.*` once and hands them in as a plain
 * object so the adapter (and finalize) stay testable.
 */
export interface RollSettingsRaw {
    defaultUnknownDifficulty: boolean;
    diceForScale: boolean;
    fundsFate: boolean;
    hideCombatCards: boolean;
    hideSkillCards: boolean;
    showSkillSpecialization: boolean;
    pipsPerDice: number;
    meleeDifficulty: boolean;
    explosiveZones: boolean;
    weaponDamageTable: Record<number, { penalty: number; label: string }>;
    flatSkills: boolean;
    brawlAttribute: string;
}

export function adaptSettings(raw: RollSettingsRaw): RollSettingsView {
    return { ...raw };
}

/**
 * Project a Foundry actor down to the discriminated {@link ActorView} shape
 * the handlers consume. Reads only what handlers reference: never the full
 * actor surface.
 *
 * Vehicle/starship actors expose their own ram/scale; character/NPC pilots
 * carry the embedded `system.vehicle` ref under `vehicle.uuid` (the deeper
 * dereferencing for ram/scale on the embedded vehicle happens via
 * {@link resolveVehicleStats}, called separately by the orchestrator when
 * a vehicle-action handler will run).
 */
export function adaptActor(actor: {
    type: string;
    uuid: string;
    system: any;
}): ActorView {
    switch (actor.type) {
        case 'vehicle':
            return {
                type: 'vehicle',
                uuid: actor.uuid,
                scale: actor.system?.scale ? { score: +actor.system.scale.score } : undefined,
                ram: actor.system?.ram ? { score: +actor.system.ram.score } : undefined,
                ram_damage: actor.system?.ram_damage ? { score: +actor.system.ram_damage.score } : undefined,
            };
        case 'starship':
            return {
                type: 'starship',
                uuid: actor.uuid,
                scale: actor.system?.scale ? { score: +actor.system.scale.score } : undefined,
                ram: actor.system?.ram ? { score: +actor.system.ram.score } : undefined,
                ram_damage: actor.system?.ram_damage ? { score: +actor.system.ram_damage.score } : undefined,
            };
        case 'npc':
            return {
                type: 'npc',
                uuid: actor.uuid,
                attributes: adaptAttributes(actor.system?.attributes),
                scale: actor.system?.scale ? { score: +actor.system.scale.score } : undefined,
                strengthDamage: actor.system?.strengthdamage ? +actor.system.strengthdamage.score : undefined,
                vehicle: actor.system?.vehicle?.uuid ? { uuid: actor.system.vehicle.uuid } : undefined,
            };
        case 'character':
            return {
                type: 'character',
                uuid: actor.uuid,
                attributes: adaptAttributes(actor.system?.attributes),
                scale: actor.system?.scale ? { score: +actor.system.scale.score } : undefined,
                strengthDamage: actor.system?.strengthdamage ? +actor.system.strengthdamage.score : undefined,
                vehicle: actor.system?.vehicle?.uuid ? { uuid: actor.system.vehicle.uuid } : undefined,
            };
        default:
            throw new Error(`adaptActor: unsupported actor type "${actor.type}"`);
    }
}

function adaptAttributes(
    attributes: Record<string, { score: number | string }> | undefined,
): Record<string, { score: number }> | undefined {
    if (!attributes) return undefined;
    const out: Record<string, { score: number }> = {};
    for (const [key, value] of Object.entries(attributes)) {
        out[key] = { score: +value.score };
    }
    return out;
}

/**
 * Project a Foundry item to the {@link ItemView} the handlers consume. The
 * weapon family reads the broadest field surface; skill / specialization
 * only need attribute / skill. Unknown item types pass through with just
 * `type` set so handlers can early-out on missing weapon fields.
 */
export function adaptItem(item: {
    type: string;
    name?: string;
    system: any;
}): ItemView {
    const base: ItemView = { type: item.type, name: item.name };
    if (item.type === 'skill') {
        return { ...base, attribute: item.system?.attribute };
    }
    if (item.type === 'specialization') {
        return {
            ...base,
            attribute: item.system?.attribute,
            skill: item.system?.skill,
        };
    }
    if (item.type === 'weapon' || item.type === 'starship-weapon' || item.type === 'vehicle-weapon') {
        const sys = item.system ?? {};
        return {
            ...base,
            damage: sys.damage ? {
                type: sys.damage.type,
                score: +sys.damage.score,
                str: !!sys.damage.str,
                muscle: !!sys.damage.muscle,
            } : undefined,
            stun: sys.stun ? {
                type: sys.stun.type,
                score: sys.stun.score !== undefined ? +sys.stun.score : undefined,
                stun_only: !!sys.stun.stun_only,
            } : undefined,
            range: sys.range ?? false,
            scale: sys.scale ? { score: +sys.scale.score } : undefined,
            damaged: sys.damaged !== undefined ? +sys.damaged : undefined,
            mods: sys.mods ? {
                damage: +(sys.mods.damage ?? 0),
                attack: +(sys.mods.attack ?? 0),
                difficulty: +(sys.mods.difficulty ?? 0),
            } : undefined,
            stats: sys.stats ? { skill: sys.stats.skill, specialization: sys.stats.specialization } : undefined,
            blast_radius: sys.blast_radius ? {
                '1': sys.blast_radius['1']
                    ? { stun_damage: +sys.blast_radius['1'].stun_damage }
                    : undefined,
            } : undefined,
            difficulty: sys.difficulty,
            isExplosive: typeof sys.subtype === 'string' && sys.subtype.toLowerCase() === 'explosive',
        };
    }
    return base;
}

/**
 * Project canvas tokens to the minimal {@link TargetView} shape — only the
 * scale matters for the rules math (range bucketing is preflight; positions
 * stay there).
 */
export function adaptTargets(
    tokens: ReadonlyArray<{ actor?: { system?: { scale?: { score?: number } } } }>,
): ReadonlyArray<TargetView> {
    return tokens.map((t) => ({
        scale: +(t.actor?.system?.scale?.score ?? 0),
    }));
}

/**
 * Compose the four adapters into a {@link HandlerContext}. Pre-resolution
 * helpers (actionSkill, vehicleStats) are attached separately by the
 * orchestrator when a key needs them; this function builds the always-on
 * fields.
 */
export interface AdaptContextDeps {
    settings: RollSettingsRaw;
    localize: Localize;
    canvasTargets: ReadonlyArray<{ actor?: { system?: { scale?: { score?: number } } } }>;
}

export function adaptContext(
    actor: { type: string; uuid: string; system: any },
    item: { type: string; name?: string; system: any } | undefined,
    deps: AdaptContextDeps,
): HandlerContext {
    return {
        actor: adaptActor(actor),
        item: item ? adaptItem(item) : undefined,
        targets: adaptTargets(deps.canvasTargets),
        settings: adaptSettings(deps.settings),
        localize: deps.localize,
    };
}
