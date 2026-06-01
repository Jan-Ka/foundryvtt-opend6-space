/**
 * Optional workaround for module conflicts where global `mousedown` listeners
 * on `window` fire while the user is clicking on an OD6S sheet/dialog (#166).
 *
 * The known instance is the `Pings` module (foundry-azzurite/pings v1.4.3),
 * which tracks "is the cursor over `#interface`?" via mouseenter / mouseleave
 * on `#interface`. In Foundry v14, `ApplicationV2._insertElement` mounts
 * windows to `document.body` directly (foundry.mjs ~30486), so sheets are
 * siblings of `#interface`, not descendants. The Pings flag stays false over
 * sheets and its window-level `mousedown` listener triggers a canvas ping.
 *
 * Behavior when enabled: a `mousedown` listener on `document.body` in the
 * bubble phase intercepts events that originate inside any application
 * element (any `.application` or `<dialog>`) and calls `stopPropagation`,
 * preventing the window-level listener from firing. Listeners attached *on*
 * the sheet itself (in capture or bubble) still fire as normal because they
 * run before the body-level listener; only the path between body → document
 * → window is blocked.
 */

let attached: ((ev: MouseEvent) => void) | null = null;

function blockBleed(ev: MouseEvent): void {
    const t = ev.target as HTMLElement | null;
    if (t?.closest('.application, dialog')) {
        ev.stopPropagation();
    }
}

export function applySheetPointerBleedSetting(enabled: boolean): void {
    if (enabled && !attached) {
        attached = blockBleed;
        document.body.addEventListener('mousedown', attached, false);
    } else if (!enabled && attached) {
        document.body.removeEventListener('mousedown', attached, false);
        attached = null;
    }
}
