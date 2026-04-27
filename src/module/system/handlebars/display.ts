/**
 * Display and formatting Handlebars helpers.
 */
import OD6S from "../../config/config-od6s";

export function registerDisplayHelpers() {
    Handlebars.registerHelper('getModColor', function (mod) {
        if (OD6S.highlightEffects) {
            if (mod > 0) {
                return " moddedup"
            } else if (mod < 0) {
                return " moddeddown"
            } else {
                return
            }
        } else {
            return
        }
    })

    Handlebars.registerHelper('compareSubtype', function (subType, compare) {
        const testString = subType.toUpperCase();
        const compareString = compare.toUpperCase();
        if (game.i18n.localize(compare) === subType) {
            return true;
        } else {
            const e = OD6S.weaponTypeKeys.find((type: any) => type.name === subType);
            if (e?.key === compareString) {
                return true;
            } else {
                return (compareString === testString);
            }
        }
    })

    Handlebars.registerHelper('displayRange', function (subType) {
        if (subType === 'meleeattack' || subType === 'brawlattack') {
            if (OD6S.meleeDifficulty) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    })

    Handlebars.registerHelper('isEvenAttribute', function (value) {
        return value % 2 === 0;
    })

    Handlebars.registerHelper('isdefined', function (value) {
        return value === 0 ? true : typeof (value) !== 'undefined' && value !== null;
    });

    Handlebars.registerHelper('concat', function () {
        let outStr = '';
        for (const arg in arguments) {
            if (typeof arguments[arg] != 'object') {
                outStr += arguments[arg];
            }
        }
        return outStr;
    });

    Handlebars.registerHelper('add', function () {
        let sum = 0;
        for (let i = 0; i < arguments.length - 1; i++) {
            sum += parseInt(arguments[i]);
        }
        return sum;
    })

    Handlebars.registerHelper('abs', function (num) {
        return Math.abs(num);
    })

    Handlebars.registerHelper('toLowerCase', function (str) {
        return str.toLowerCase();
    });

    Handlebars.registerHelper('toUpperCase', function (str) {
        return str.toUpperCase();
    });

    Handlebars.registerHelper('getBodyTemplate', function (type) {
        return "systems/od6s/templates/actor/" + type + "/body-sheet.html";
    })

    Handlebars.registerHelper('getHeaderFormTemplate', function (type) {
        return "systems/od6s/templates/actor/" + type + "/header-sheet.html";
    })

    Handlebars.registerHelper('getWoundsTemplate', function () {
        return "systems/od6s/templates/actor/common/wounds.html";
    })

    Handlebars.registerHelper('displayCharacterTemplateClear', function (actor) {
        const template = actor.items.find((E: any) => E.type === 'character-template');
        if (actor.sheetmode === 'freeedit') {
            if (template) {
                return true;
            } else {
                return false;
            }
        }
    })

    Handlebars.registerHelper('displaySpeciesTemplateClear', function (actor) {
        const template = actor.items.find((E: any) => E.type === 'species-template');
        if (template) {
            return true;
        } else {
            return false;
        }
    })

    Handlebars.registerHelper('getActorNameFromId', function (actorID) {
        let actor;
        // Is it a token?
        actor = game.scenes.active.tokens.filter(t => t.id === actorID);
        if (actor.length === 0) {
            actor = game.actors.filter(actor => actor.id === actorID);
        }
        if (actor.length === 0) return;
        return actor[0].name;
    })

    Handlebars.registerHelper('getActorNameFromUuid', function (uuid) {
        // @ts-expect-error
        return getActorNameFromUuid(uuid);
    })

    Handlebars.registerHelper('actionsCount', async function (actor) {
        return (actor.actions.length);
    })

    Handlebars.registerHelper('getFlag', function (message, flag) {
        return message.getFlag('od6s', flag);
    })

    Handlebars.registerHelper('isGmOrOwner', function (id) {
        if (game.user.isGM) return true;
        // @ts-expect-error
        return game!.actors.find(a => a.id === id).isOwner;
    })

    Handlebars.registerHelper('isKnown', function (isKnown) {
        if (game.user.isGM) return true;
        return isKnown;
    })

    Handlebars.registerHelper('isGM', function () {
        return game.user.isGM;
    })

    Handlebars.registerHelper('and', function () {
        // Get function args and remove last one (meta object); every(Boolean) checks AND
        return Array.prototype.slice.call(arguments, 0, arguments.length - 1).every(Boolean);
    });

    Handlebars.registerHelper('or', function () {
        // Get function args and remove last one (meta object); some(Boolean) checks OR
        return Array.prototype.slice.call(arguments, 0, arguments.length - 1).some(Boolean);
    });

    Handlebars.registerHelper('getCyberneticsLocations', () => {
        return OD6S.cyberneticsLocations;
    })

    Handlebars.registerHelper('getCybernetics', function (actor, location) {
        return actor.items.filter((i: any) => i.type === "cybernetic" && i.system.location === location);
    })

    Handlebars.registerHelper('hasCybernetics', function (actor) {
        return actor.items.filter((i: any) => i.type === "cybernetic").length;
    })

    Handlebars.registerHelper('getManifestations', function (actor) {
        return actor.items.filter((i: any) => i.type === "manifestation");
    })

    Handlebars.registerHelper('getCargoHoldItems', function (itemType, actorType) {
        return !OD6S.allowedItemTypes[actorType].includes(itemType);
    })

    Handlebars.registerHelper('getContainerItemCategories', function () {
        const categories = {};
        for (const i of OD6S.allowedItemTypes['container']) {
            (categories as any)[i] = OD6S.itemLabels[i]
        }
        return categories;
    })

    Handlebars.registerHelper('getCheckedItemType', function (key, itemTypes) {
        return Boolean(itemTypes[key]);
    })

    Handlebars.registerHelper('getContainerItems', function (type, items) {
        const categoryItems = items.filter((i: any) => i.type === type);
        return categoryItems;
    })

    Handlebars.registerHelper('getCharacterInventoryForContainer', function () {
        // @ts-expect-error
        return game!.user.character.items.filter(i => OD6S.equippable.includes(i.type));
    })

    Handlebars.registerHelper('getCharacterActorId', function () {
        // @ts-expect-error
        return game!.user.character.id;
    })
}
