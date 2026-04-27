import {debug} from "../logger";

export function evaluateChange(change: ActiveEffectChange, caller: Actor | Item): number {
    let ctx: Actor;
    if (caller.documentName === 'Actor') {
        ctx = caller as Actor;
    } else {
        ctx = (caller as Item).actor!;
    }
    let newValue = change.value;
    // Pull all variables from string
    const regex = new RegExp(/@.*?@/g)
    const matches = change.value.matchAll(regex);
    for (const m of matches) {
        const match = m[0];
        let valueString = match.replace(/@/g, '');
        valueString = valueString.replace(/^system\.items\./, '');
        valueString = valueString.replace(/^items\./, '');
        if(valueString.match(/^(skill|specialization|weapon|vehicle-weapon|starship-weapon)/)) {
            const c = valueString.split('.');
            const item = ctx.items.find((item: Item) => item.name === c[1] && item.type === c[0]);
            if(typeof(item) === 'undefined' || item === null) return 0;
            const stripName = new RegExp(`^(skill|specialization|weapon|vehicle-weapon|starship-weapon)s?.${c[2]}.`)
            if(c[0].match(/(skill|specialization)s?/) && c[3] === 'score') {
                newValue = newValue.replace(match, item.getScore());
            } else {
                valueString = valueString.replace(stripName, '');
                const value = foundry.utils.getProperty(item, valueString);
                newValue = newValue.replace(match, value)
            }
        } else {
            // From actor
            const value = foundry.utils.getProperty(ctx, valueString);
            newValue = newValue.replace(match, value);
        }
    }
    if (typeof(newValue) === 'undefined' || newValue.includes('undefined') && (game.user as any).isGM()) {
        ui.notifications.warn(game.i18n.localize('OD6S.WARN_EFFECT_PARSE') + ' ' + change.value);
        return 0;
    }
    const result = new Roll(newValue).evaluateSync().total;
    debug('effects', 'evaluateChange', {original: change.value, substituted: newValue, result});
    return result;
}

export function applyDerivedEffect(obj: Actor, change: ActiveEffectChange): void {
    const valueString = change.value.replace(/^.*@/, '');
    if(valueString.match(/^(skill|skills|specilaziation|specializations)/)) {
        // noop
    }
    const derived = foundry.utils.getProperty(obj, valueString);
    if (typeof derived !== 'undefined' && derived !== null) {
        const origValue = foundry.utils.getProperty(obj, change.key);
        if (typeof (origValue) !== 'undefined' || origValue !== null) {
            let multiplier = 1;
            if (change.value.startsWith('-')) {
                multiplier = -1
            }
            const newValue = (origValue + derived) * multiplier;
            foundry.utils.setProperty(obj, change.key, newValue);
        }
    }
}

export async function handleEffectChange(_effect: ActiveEffect): Promise<void> {
}
