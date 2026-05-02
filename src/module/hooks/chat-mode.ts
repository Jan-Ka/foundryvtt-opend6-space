/**
 * Pure helpers for chat-message visibility classification. No Foundry globals,
 * so tests can import directly.
 */

export type RollMode = 'public' | 'self' | 'gm' | 'blind';

export interface DeriveRollModeInput {
    blind?: boolean;
    whisper?: string[] | null;
    author?: { id?: string | null } | null;
    /**
     * Persisted roll mode set at message creation in roll-execute.ts. When
     * present this wins outright — Foundry's whisper/blind alone can't
     * distinguish a single-GM /gmroll from a /selfroll (both have whisper
     * === [author.id]).
     */
    flags?: { od6s?: { rollMode?: string } } | null;
}

const PERSISTED_TO_MODE: Record<string, RollMode> = {
    publicroll: 'public',
    gmroll:     'gm',
    blindroll:  'blind',
    selfroll:   'self',
};

/**
 * Classify a chat message into one of four modes. Prefers the persisted
 * `flags.od6s.rollMode` set by our roll dialog; falls back to deriving from
 * Foundry's blind/whisper/author for messages we didn't author (typed
 * `/gmroll`, third-party modules, pre-existing history).
 */
export function deriveRollMode(msg: DeriveRollModeInput): RollMode {
    const persisted = msg?.flags?.od6s?.rollMode;
    if (persisted && PERSISTED_TO_MODE[persisted]) return PERSISTED_TO_MODE[persisted];

    if (msg?.blind) return 'blind';
    const whisper = Array.isArray(msg?.whisper) ? msg.whisper : [];
    if (!whisper.length) return 'public';
    const authorId = msg?.author?.id ?? null;
    if (authorId && whisper.length === 1 && whisper[0] === authorId) return 'self';
    return 'gm';
}
