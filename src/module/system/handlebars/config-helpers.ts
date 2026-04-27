/**
 * Configuration getter Handlebars helpers.
 */
import OD6S from "../../config/config-od6s";
import {od6sutilities} from "../utilities";
import {getAttributeName, getAttributeShortName} from "../../macros";

export function registerConfigHelpers() {
    Handlebars.registerHelper('getConfig', function (key, subKey) {
        if (typeof subKey !== 'undefined' && subKey !== '') {
            return OD6S[key][subKey];
        }
        return OD6S[key];
    })

    Handlebars.registerHelper('getSystemConfig', function (config) {
        return game.settings.get('od6s', config);
    })

    Handlebars.registerHelper('getCustomField1', function () {
        const customField = game.settings.get('od6s', 'custom_field_1');
        if (typeof (customField) === 'undefined') {
            return "";
        }
        return customField;
    })

    Handlebars.registerHelper('getCustomField1Short', function () {
        const customField = game.settings.get('od6s', 'custom_field_1_short');
        if (typeof (customField) === 'undefined' || customField === '') {
            return game.settings.get('od6s', 'custom_field_1');
        } else {
            return game.settings.get('od6s', 'custom_field_1_short');
        }
    })

    Handlebars.registerHelper('getCustomField1Type', function () {
        const thisType = game.settings.get('od6s', 'custom_field_1_type');
        if (thisType === "string") {
            return "text";
        }
        if (thisType === "number") {
            return "number";
        }
    })

    Handlebars.registerHelper('getCustomField1FType', function () {
        const thisType = game.settings.get('od6s', 'custom_field_1_type')
        if (thisType === "string") {
            return "String";
        }

        if (thisType === "number") {
            return "Number";
        }
    })

    Handlebars.registerHelper('getCustomField2', function () {
        const customField = game.settings.get('od6s', 'custom_field_2');
        if (typeof (customField) === 'undefined') {
            return "";
        }
        return customField;
    })

    Handlebars.registerHelper('getCustomField2Short', function () {
        const customField = game.settings.get('od6s', 'custom_field_2_short');
        if (typeof (customField) === 'undefined' || customField === '') {
            return game.settings.get('od6s', 'custom_field_2');
        } else {
            return game.settings.get('od6s', 'custom_field_2_short');
        }
    })

    Handlebars.registerHelper('getCustomField2Type', function () {
        const thisType = game.settings.get('od6s', 'custom_field_2_type');
        if (thisType === "string") {
            return "text";
        }
        if (thisType === "number") {
            return "number";
        }
    })


    Handlebars.registerHelper('getCustomField2FType', function () {
        const thisType = game.settings.get('od6s', 'custom_field_2_type')
        if (thisType === "string") {
            return "String";
        }

        if (thisType === "number") {
            return "Number";
        }
    })

    Handlebars.registerHelper('getCustomField3', function () {
        const customField = game.settings.get('od6s', 'custom_field_3');
        if (typeof (customField) === 'undefined') {
            return "";
        }
        return customField;
    })

    Handlebars.registerHelper('getCustomField3Short', function () {
        const customField = game.settings.get('od6s', 'custom_field_3_short');
        if (typeof (customField) === 'undefined' || customField === '') {
            return game.settings.get('od6s', 'custom_field_3');
        } else {
            return game.settings.get('od6s', 'custom_field_3_short');
        }
    })

    Handlebars.registerHelper('getCustomField3Type', function () {
        const thisType = game.settings.get('od6s', 'custom_field_3_type');
        if (thisType === "string") {
            return "text";
        }
        if (thisType === "number") {
            return "number";
        }
    })

    Handlebars.registerHelper('getCustomField3FType', function () {
        const thisType = game.settings.get('od6s', 'custom_field_3_type')
        if (thisType === "string") {
            return "String";
        }

        if (thisType === "number") {
            return "Number";
        }
    })

    Handlebars.registerHelper('getCustomField4', function () {
        const customField = game.settings.get('od6s', 'custom_field_4');
        if (typeof (customField) === 'undefined') {
            return "";
        }
        return customField;
    })

    Handlebars.registerHelper('getCustomField4Short', function () {
        const customField = game.settings.get('od6s', 'custom_field_4_short');
        if (typeof (customField) === 'undefined' || customField === '') {
            return game.settings.get('od6s', 'custom_field_4');
        } else {
            return game.settings.get('od6s', 'custom_field_4_short');
        }
    })

    Handlebars.registerHelper('getCustomField4Type', function () {
        const thisType = game.settings.get('od6s', 'custom_field_4_type');
        if (thisType === "string") {
            return "text";
        }
        if (thisType === "number") {
            return "number";
        }
    })

    Handlebars.registerHelper('getCustomField4FType', function () {
        const thisType = game.settings.get('od6s', 'custom_field_4_type')
        if (thisType === "string") {
            return "String";
        }

        if (thisType === "number") {
            return "Number";
        }
    })

    Handlebars.registerHelper('isCustomFieldUsed', function (fieldNum, type) {
        const field = 'custom_field_' + fieldNum + '_actor_types';
        const actorTypes = game.settings.get('od6s', field);
        const mask = 1 << OD6S.actorMasks[type];
        return (actorTypes & mask) !== 0;
    })

    Handlebars.registerHelper('getMetaphysicsName', function () {
        return getAttributeName('met');
    })

    Handlebars.registerHelper('getManifestationsName', function () {
        return game.i18n.localize(OD6S.manifestationsName);
    })

    Handlebars.registerHelper('getFatePointsName', function () {
        return game.i18n.localize(OD6S.fatePointsName);
    })

    Handlebars.registerHelper('getFatePointsShortName', function () {
        return game.i18n.localize(OD6S.fatePointsShortName);
    })

    Handlebars.registerHelper('getMetaphysicsExtranormalName', function () {
        return game.i18n.localize(OD6S.metaphysicsExtranormalName);
    })

    Handlebars.registerHelper('getAttributeName', function (attribute) {
        return getAttributeName(attribute);
    })

    Handlebars.registerHelper('getAttributeShortName', function (attribute) {
        return getAttributeShortName(attribute);
    })

    Handlebars.registerHelper('getAttributes', function () {
        const active = {};
        for (const attribute in OD6S.attributes) {
            if (OD6S.attributes[attribute].active) (active as any)[attribute] = OD6S.attributes[attribute];
        }
        return active;
    })

    Handlebars.registerHelper('isAttributeActive', function (key) {
        return OD6S.attributes[key].active;
    });

    Handlebars.registerHelper('getActiveAttributes', function (attributes) {
        const active = {};
        for (const attr in attributes) {
            if(attributes[attr].active) {
                (active as any)[attr] = attributes[attr];
            }
        }
        return active;
    })

    Handlebars.registerHelper('isMetaphysicsAttributeOptional', function () {
        return game.settings.get('od6s', 'metaphysics_attribute_optional');
    })

    Handlebars.registerHelper('showMetaphysics', function (sheetMode) {
        if (game.settings.get('od6s', 'metaphysics_attribute_optional')) return false;
        if (!OD6S.attributes['met'].active) return false;

        if (sheetMode === 'normal') {
            return !!game.settings.get('od6s', 'show_metaphysics_attributes');
        }

        return true;
    })

    Handlebars.registerHelper('getCurrencyLabel', function () {
        return OD6S.currencyName;
    })

    Handlebars.registerHelper('getUseFatePoint', function () {
        return game.i18n.localize(OD6S.useAFatePointName);
    })

    Handlebars.registerHelper('showDifficulty', function () {
        return game.settings.get('od6s', 'show-roll-difficulty');
    })

    Handlebars.registerHelper('showModifiers', function () {
        return game.settings.get('od6s', 'roll-modifiers');
    })

    Handlebars.registerHelper('isHideAllRolls', function () {
        return !game.settings.get('od6s', 'roll-modifiers');
    })

    Handlebars.registerHelper('showWildDie', function () {
        return game.settings.get('od6s', 'use_wild_die');
    })

    Handlebars.registerHelper('getWildDieDefault', function (key) {
        return OD6S.wildDieResult[OD6S.wildDieOneDefault] === key;
    })

    Handlebars.registerHelper('getActorTypeConfig', function (value, type) {
        return ((value >> OD6S.actorMasks[type]) % 2 !== 0);
    })

    Handlebars.registerHelper('getActorTypeLabel', (type) => {
        return OD6S.actorTypeLabels[type];
    })

    Handlebars.registerHelper('getCost', function () {
        return OD6S.cost;
    })

    Handlebars.registerHelper('getPrices', function () {
        return OD6S.difficultyShort;
    })

    Handlebars.registerHelper('hideAdvantagesDisadvantages', function () {
        return game.settings.get('od6s', 'hide_advantages_disadvantages');
    });

    Handlebars.registerHelper('templateItemTypes', function (type, actorTypes) {
        const itemTypes = {};
        let templateItems = [];

        // Item group, filter by actor types
        if (type === "item-group") {
            for (const [key, items] of Object.entries(OD6S.allowedItemTypes)) {
                if (actorTypes.includes(key)) {
                    // @ts-expect-error
                    for (const i of items) {
                        if (OD6S.templateItemTypes['item-group'].includes(i)) {
                            templateItems.push(i);
                        }
                    }
                }
            }
        } else {
            templateItems = OD6S.templateItemTypes[type];
        }
        // Remove advantages and disadvantages if hidden
        if (game.settings.get('od6s', 'hide_advantages_disadvantages')) {
            templateItems = templateItems.filter((t: any) => t !== 'advantage' || t !== 'disadvantage');
        }

        for (const e of templateItems) {
            const model = CONFIG.Item.dataModels[e];
            const defaultData = model ? model.defineSchema() : {};
            const label = (e === 'manifestation') ? OD6S.manifestationsName :
                (defaultData.label?.initial ?? e);
            (itemTypes as any)[e] = { label };
        }
        return itemTypes;
    })

    Handlebars.registerHelper('getCharacterTemplates', function () {
        return od6sutilities.getAllItemsByType('character-template');
    })
}
