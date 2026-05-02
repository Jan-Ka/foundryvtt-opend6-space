/**
 * Pure helpers for chat-message visibility classification. No Foundry globals,
 * so tests can import directly.
 */

export type RollMode = 'public' | 'self' | 'gm' | 'blind';

export interface DeriveRollModeInput {
    blind?: boolean;
    whisper?: string[] | null;
    author?: { id?: string | null } | null;
}

/**
 * Classify a chat message into one of four modes from the fields Foundry
 * already stores on the document. Used to tag the rendered <li> with a
 * mode-specific class and inject the badge in the header.
 */
export function deriveRollMode(msg: DeriveRollModeInput): RollMode {
    if (msg?.blind) return 'blind';
    const whisper = Array.isArray(msg?.whisper) ? msg.whisper : [];
    if (!whisper.length) return 'public';
    const authorId = msg?.author?.id ?? null;
    if (authorId && whisper.length === 1 && whisper[0] === authorId) return 'self';
    return 'gm';
}
