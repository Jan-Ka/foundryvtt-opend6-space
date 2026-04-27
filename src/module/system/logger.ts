/**
 * Lightweight debug logger gated on `globalThis.od6sDebug`.
 *
 * Enable from the browser console:
 *   od6sDebug = true               // log everything (this session)
 *   od6sDebug = ['wounds','rolls'] // log only listed categories
 *   od6sDebug = false              // off
 *
 * To persist across reloads (e.g. to capture migrations on the next load):
 *   localStorage.od6sDebug = 'true'
 *   localStorage.od6sDebug = '["migration"]'
 *   localStorage.removeItem('od6sDebug')
 *
 * Safe to call when disabled — short-circuits before formatting args.
 */

declare global {
    var od6sDebug: boolean | string[] | undefined;
}

export function isDebugEnabled(category?: string): boolean {
    let flag: unknown = (globalThis as any).od6sDebug;
    if (flag === undefined) {
        try {
            const stored = globalThis.localStorage?.getItem("od6sDebug");
            if (stored) flag = JSON.parse(stored);
        } catch {
            // localStorage unavailable or stored value isn't valid JSON — treat as off
        }
    }
    if (!flag) return false;
    if (flag === true) return true;
    if (Array.isArray(flag) && category) return flag.includes(category);
    return false;
}

export function debug(category: string, ...args: any[]): void {
    if (!isDebugEnabled(category)) return;
     
    console.debug(`[od6s:${category}]`, ...args);
}
