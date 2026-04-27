/**
 * Recursively access a nested property by dot-separated path.
 * e.g. accessDeepProp({a: {b: 1}}, "a.b") → 1
 */
export function accessDeepProp(obj: Record<string, unknown>, path: string): unknown {
    if (!path) return obj;
    const properties = path.split(".");
    return accessDeepProp(obj[properties.shift()!] as Record<string, unknown>, properties.join("."));
}

/**
 * Coerce a value to boolean, handling string "true".
 */
export function boolCheck(value: unknown): boolean | unknown {
    if (typeof value === "string") {
        return value === "true";
    } else {
        return value;
    }
}

/**
 * Async delay helper.
 */
export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Look up attribute key from attribute ID.
 */
export function lookupAttributeKey(id: string, attributes: Record<string, { id: string }>): string | undefined {
    for (const key in attributes) {
        if (attributes[key].id === id) return key;
    }
    return undefined;
}
