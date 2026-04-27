/**
 * Lightweight debug logger gated on `globalThis.od6sDebug`.
 *
 * Enable from the browser console:
 *   od6sDebug = true               // log everything
 *   od6sDebug = ['wounds','rolls'] // log only listed categories
 *   od6sDebug = false              // off
 *
 * Safe to call when disabled — short-circuits before formatting args.
 */

declare global {
    var od6sDebug: boolean | string[] | undefined;
}

export function isDebugEnabled(category?: string): boolean {
    const flag = (globalThis as any).od6sDebug;
    if (!flag) return false;
    if (flag === true) return true;
    if (Array.isArray(flag) && category) return flag.includes(category);
    return false;
}

export function debug(category: string, ...args: any[]): void {
    if (!isDebugEnabled(category)) return;
     
    console.debug(`[od6s:${category}]`, ...args);
}
