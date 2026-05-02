import { describe, it, expect } from 'vitest';
import { deriveRollMode } from './chat-mode';

describe('deriveRollMode', () => {
    it('classifies a public message (no whisper, not blind)', () => {
        expect(deriveRollMode({ whisper: [], author: { id: 'u1' } })).toBe('public');
    });

    it('classifies a blind roll regardless of whisper recipients', () => {
        // Blind rolls are typically also whispered to GMs; the blind flag wins.
        expect(deriveRollMode({ blind: true, whisper: ['gm1', 'gm2'], author: { id: 'u1' } })).toBe('blind');
        expect(deriveRollMode({ blind: true, whisper: [], author: { id: 'u1' } })).toBe('blind');
    });

    it('classifies a self-roll when the only recipient is the author', () => {
        expect(deriveRollMode({ whisper: ['u1'], author: { id: 'u1' } })).toBe('self');
    });

    it('classifies a GM-whisper when recipients are not just the author', () => {
        expect(deriveRollMode({ whisper: ['gm1'], author: { id: 'u1' } })).toBe('gm');
        expect(deriveRollMode({ whisper: ['u1', 'gm1'], author: { id: 'u1' } })).toBe('gm');
    });

    it('falls back to gm when author has no id (cannot prove self-roll)', () => {
        expect(deriveRollMode({ whisper: ['anyone'], author: null })).toBe('gm');
    });

    it('treats missing whisper field as public', () => {
        expect(deriveRollMode({ author: { id: 'u1' } })).toBe('public');
    });
});
