import { describe, it, expect } from 'vitest';
import { accessDeepProp, boolCheck, lookupAttributeKey } from './converters';

describe('accessDeepProp', () => {
    it('accesses a nested property by dot path', () => {
        expect(accessDeepProp({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
    });

    it('returns the object itself for empty path', () => {
        const obj = { x: 1 };
        expect(accessDeepProp(obj, '')).toBe(obj);
    });

    it('accesses a top-level property', () => {
        expect(accessDeepProp({ foo: 'bar' }, 'foo')).toBe('bar');
    });

    it('returns undefined for missing path', () => {
        expect(accessDeepProp({ a: 1 }, 'b')).toBeUndefined();
    });
});

describe('boolCheck', () => {
    it('returns true for string "true"', () => {
        expect(boolCheck('true')).toBe(true);
    });

    it('returns false for string "True" (case-sensitive)', () => {
        expect(boolCheck('True')).toBe(false);
    });

    it('returns false for string "false"', () => {
        expect(boolCheck('false')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(boolCheck('')).toBe(false);
    });

    it('passes through non-string values unchanged', () => {
        expect(boolCheck(1)).toBe(1);
        expect(boolCheck(0)).toBe(0);
        expect(boolCheck(null)).toBe(null);
        expect(boolCheck(true)).toBe(true);
        expect(boolCheck(false)).toBe(false);
    });
});

describe('lookupAttributeKey', () => {
    const attributes = {
        agi: { id: 'attr_agi' },
        str: { id: 'attr_str' },
        mec: { id: 'attr_mec' },
    };

    it('finds key by attribute id', () => {
        expect(lookupAttributeKey('attr_str', attributes)).toBe('str');
    });

    it('returns undefined for unknown id', () => {
        expect(lookupAttributeKey('attr_unknown', attributes)).toBeUndefined();
    });
});
