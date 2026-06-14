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

    console.debug(`[nonex-ist-od6s:${category}]`, ...args);
}

/**
 * Always-on warning breadcrumb for non-fatal mismatches the user should
 * see (schema-version drift, deprecated flag shapes). Sits between
 * `debug` (gated) and `error` (failure), and routes through `console.warn`
 * so dev-tools severity filters still distinguish it from hard errors.
 */
export function warn(category: string, ...args: any[]): void {
    console.warn(`[nonex-ist-od6s:${category}]`, ...args);
}

/**
 * Always-on error breadcrumb for swallowed/unexpected failures at handler
 * boundaries (sockets, sheet form-submits, post-roll cleanup). Unlike
 * `debug`, this fires regardless of the debug flag — the point is to leave
 * a system-tagged trace in the console when an async Foundry call rejects.
 */
export function error(category: string, ...args: any[]): void {

    console.error(`[nonex-ist-od6s:${category}]`, ...args);
}
