import {od6sroll} from "../apps/roll";
import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class OD6SItem extends Item {

    /**
     * Set the image as blank if it doesn't exist, rather than the default
     * @param data
     * @param options
     * @returns {Promise<abstract.Document>}
     */
    static async create(data: any, options={}) {
        if (!data.img)
            data.img = "systems/od6s/icons/blank.png";
        return await super.create(data, options);
    }

    /*
     * Augment the basic Item data model with additional dynamic data.
     */
    prepareData() {
        super.prepareData();
        this.system.config = OD6S;
    }

    prepareBaseData() {
        super.prepareBaseData();
    }

    /**
     * Create derived data for the item
     */
    prepareDerivedData() {
        if (this.type === 'skill' || this.type === 'specialization') {
            this.system.score = (+this.system.base) + (+this.system.mod);
        }
        if (this.type === 'starship-weapon' || this.type === 'vehicle-weapon') {
            this.system.stats = {};
            this.system.stats.attribute = this.system.attribute.value;
            this.system.stats.skill = this.system.skill.value;
            this.system.stats.specialization = this.system.specialization.value;
            this.system.subtype = 'vehiclerangedweaponattack';
        }
    }

    findActiveEffects() {
        const changes = [];
        const type = this.type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const name = this.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const itemRegex = new RegExp(`^(system)?.?(items)?.?${type}s?.${name}.`);
        if(this?.actor !== null) {
            for (const effect of this.actor.allApplicableEffects()) {
                if (!effect?.active) continue;
                changes.push(...effect.changes.filter(c => c.type === "custom" &&
                    c.key.match(itemRegex)));
            }
            for (const change in changes) {
                const changeValue = od6sutilities.evaluateChange(changes[change], this);
                const newProp = changes[change].key.replace(itemRegex, '');
                const origValue = foundry.utils.getProperty(this, newProp);
                if (typeof (origValue) === 'undefined' || origValue === null) continue;
                foundry.utils.setProperty(this, newProp, changeValue + origValue);
            }
        }
    }

    applyMods() {
        if(this.type.match(/^(skill|specialization)/)) {
            this.system.score = (+this.system.base) + (+this.system.mod);
        }
    }

    getScore() {
        if (this.type.match(/^(skill|specialization)/)) {
            if (this.actor) {
                if (this.system.isAdvancedSkill) {
                    return this.system.score;
                } else {
                    return this.actor.system.attributes[this.system.attribute.toLowerCase()].score + this.system.score;
                }
            }
        }
        if (this.type.match(/weapon/)) {
            if (this.actor) {
                let score = this.actor.system.attributes[this.system.stats.attribute.toLowerCase()].score;
                const spec = this.actor.items.find(i => i.name === this.system.stats.specialization && i.type === 'specialization');
                if (typeof spec !== 'undefined') {
                    if (typeof this.system.fire_control !== 'undefined' && this.system.fire_control?.score !== '') {
                        score = score + this.system.fire_control.score;
                    }
                    return score + spec.system.score;
                } else {
                    const skill = this.actor.items.find(i => i.name === this.system.stats.skill && i.type === 'skill');
                    if (typeof skill !== 'undefined') {
                        if (typeof this.system.fire_control !== 'undefined' && this.system.fire_control?.score !== '') {
                            score = score + this.system.fire_control.score;
                        }
                        return score + skill.system.score;
                    }
                }
                if (typeof this.system.fire_control?.score !== 'undefined' && this.system.fire_control?.score !== '') {
                    score = score + this.system.fire_control.score;
                }
                return score;
            }
        }
    }

    getScoreText() {
        return od6sutilities.getTextFromDice(od6sutilities.getDiceFromScore(this.getScore()))
    }

    getParryText() {
        if (this.type === 'weapon') {
            if (this.actor) {
                if (this.system.stats.parry_specialization !== '') {
                    const spec = this.actor.items.find(s => s.name === this.system.stats.parry_specialization && s.type === 'specialization');
                    if (typeof spec !== 'undefined') return spec.getScoreText();
                }
                if (this.system.stats.parry_skill !== '') {
                    if(this.actor) {
                        const skill = this.actor.items.find(s=>s.name === this.system.stats.parry_skill && s.type === 'skill' );
                        if (typeof skill !== 'undefined') return skill.getScoreText();
                    }
                }
                return this.actor.getActionScoreText('parry')
            }
        }
    }

    /**
     * Filter the Create New Item dialog
     */
    static async createDialog(data={}, {parent=null, pack=null, ...options}={}) {

        // Collect data
        const documentName = this.metadata.name;
        let types = game.documentTypes[documentName].filter(t => t !== CONST.BASE_DOCUMENT_TYPE);
        let collection;
        if ( !parent ) {
            if ( pack ) collection = game.packs.get(pack);
            else collection = game.collections.get(documentName);
        }
        const folders = collection?._formatFolderSelectOptions() ?? [];
        const label = game.i18n.localize(this.metadata.label);
        const title = game.i18n.format("DOCUMENT.Create", {type: label});

        types = types.filter(function (value, _index, _arr) {
            return value !== 'action' && value !== 'vehicle' && value !== 'base';
        });

        if (game.settings.get('od6s', 'hide_advantages_disadvantages')) {
            types = types.filter(function (value, _index, _arr) {
                return value !== 'advantage';
            })
            types = types.filter(function (value, _index, _arr) {
                return value !== 'disadvantage';
            })
        }

        types = types.sort(function (a, b) {
            return a.localeCompare(b);
        })

        // Render the document creation form
        const html = await renderTemplate("templates/sidebar/document-create.html", {
            folders,
            name: (data as any).name || game.i18n.format("DOCUMENT.New", {type: label}),
            folder: (data as any).folder,
            hasFolders: folders.length >= 1,
            type: (data as any).type || CONFIG[documentName]?.defaultType || types[0],
            types: types.reduce((obj, t) => {
                const label = CONFIG[documentName]?.typeLabels?.[t] ?? t;
                (obj as any)[t] = game.i18n.has(label) ? game.i18n.localize(label) : t;
                return obj;
            }, {}),
            hasTypes: types.length > 1
        });

        // Render the confirmation dialog window
        return Dialog.prompt({
            title: title,
            content: html,
            label: title,
            callback: html => {
                const form = html[0].querySelector("form");
                const fd = new FormDataExtended(form);
                foundry.utils.mergeObject(data, fd.object, {inplace: true});
                if ( !(data as any).folder ) delete (data as any).folder;
                if ( types.length === 1 ) (data as any).type = types[0];
                if ( !(data as any).name?.trim() ) (data as any).name = this.defaultName();
                return this.create(data, {parent, pack, renderSheet: true});
            },
            rejectClose: false,
            options
        });
    }

    /**
     * Handle clickable item rolls.
     * @private
     */
    async roll(parry = false) {
        // Basic template rendering data
        const item = this;
        const actor = this.actor ? this.actor : {};
        const actorData = (this.actor?.system ?? {}) as OD6SCharacterSystem & Record<string, any>;
        const itemData = item.system;
        let flatPips = 0;

        const rollData: any = {};
        rollData.token = this.parent.sheet.token;

        switch (item.type) {
            case 'skill':
            case 'specialization': {
                if (OD6S.flatSkills) {
                    rollData.score = +(actorData.attributes[itemData.attribute.toLowerCase()].score);
                    flatPips = (+itemData.score)
                } else {
                    if (itemData.isAdvancedSkill) {
                        rollData.score = (+itemData.score);
                    } else {
                        rollData.score = (+itemData.score) + actorData.attributes[itemData.attribute.toLowerCase()].score;
                    }
                }
                break;
            }
            case 'starship-weapon':
            case 'vehicle-weapon':
            case 'weapon': {
                // Try a specialization first, then a skill, then an attribute
                let found = false;

                if (parry && game.settings.get('od6s','parry_skills')) {
                    let skill;
                    if(typeof(this.system.stats.parry_specialization) !== "undefined" && this.system.stats.parry_specialization !== "") {
                        skill = (actor as any).items.find((skill: any) => skill.name === this.system.stats.parry_specialization && skill.type === 'specialization');
                    }
                    else if(typeof(this.system.stats.parry_skill) !== "undefined" && this.system.stats.parry_skill !== "") {
                    	skill = (actor as any).items.find((skill: any) => skill.name === this.system.stats.parry_skill && skill.type === 'skill');
                     } else {
                    	skill = (actor as any).items.find((skill: any) => skill.name === game.i18n.localize(OD6S.actions.parry.skill) && skill.type === 'skill');
                    }
                    if (skill) {
                        if(OD6S.flatSkills) {
                            rollData.score = (+actorData.attributes[skill.system.attribute.toLowerCase()].score);
                            flatPips = (+skill.system.score);
                        } else {
                            rollData.score = (+skill.system.score) + (+actorData.attributes[skill.system.attribute.toLowerCase()].score);
                        }
                    } else {
                        rollData.score = actorData.attributes[OD6S.actions.parry.base.toLowerCase()].score;
                    }
                    found = true;
                }

                if (!found && itemData.stats.specialization !== null) {
                    const spec = (actor as any).items.find((spec: any) => spec.name === itemData.stats.specialization && spec.type === 'specialization');                    if (spec) {
                        if(OD6S.flatSkills) {
                            rollData.score = (+actorData.attributes[spec.system.attribute.toLowerCase()].score);
                            flatPips = (+spec.system.score);
                        } else {
                            rollData.score = (+spec.system.score) + (+actorData.attributes[spec.system.attribute.toLowerCase()].score);
                        }
                        found = true;
                    }
                }
                if (!found) {
                    // See if the actor has the associated skill
                    const skill = (actor as any).items.find((skill: any) => skill.name === itemData.stats.skill && skill.type === 'skill');
                    let attr = actorData.attributes[itemData.stats.attribute.toLowerCase()];
                    if(typeof(attr?.score) === "undefined" || attr === null) {
                        // See if it maps to the "shortname" of a custom attribute label
                        // @ts-expect-error
                        attr = actorData.attributes[od6sutilities.lookupAttributeKey(itemData.stats.attribute.toLowerCase())];
                        if(typeof(attr?.score) === "undefined" || attr === null) return false;
                    }
                    if (typeof (skill) !== 'undefined' && skill !== null) {
                        if(OD6S.flatSkills) {
                            rollData.score = (+attr.score);
                            flatPips = (+skill.system.score);
                        } else {
                            rollData.score = (+skill.system.score) + (+attr.score);
                        }
                    } else {
                        // Finally, use base attribute
                        if(item.type === 'vehicle-weapon' || item.type === 'starship-weapon') {
                            rollData.score = attr.score;
                        } else if (item.type === 'weapon') {

                            rollData.score = attr.score;
                        }
                        else {
                            rollData.score = attr.score;
                        }
                    }
                }
                break;
            }
            case 'action': {
                let name = '';
                if ((itemData.subtype === 'rangedattack' || itemData.subtype === 'meleeattack') && itemData.itemId !== '') {
                    // Roll is linked to an inventory item, roll that instead
                    const targetItem = (actor as any).items.find((i: any) => i.id === itemData.itemId);
                    return targetItem.roll(parry);
                }

                if (itemData.subtype === 'dodge' || itemData.subtype === 'parry' || itemData.subtype === 'block') {
                    // Get the appropriate skill or attribute
                    switch (itemData.subtype) {
                        case 'dodge':
                            name = 'OD6S.DODGE';
                            break;
                        case 'parry':
                            if ((actor as any).items.find((i: any) => i.id === itemData.itemId)) {
                                const targetItem = (actor as any).items.find((i: any) => i.id === itemData.itemId);
                                return targetItem.roll(true);
                            } else {
                                name = OD6S.actions.parry.skill;
                            }
                            break;
                        case 'block':
                            name = OD6S.actions.block.skill;
                            break;
                    }
                }
                name = game.i18n.localize(name);

                if (itemData.subtype === 'attribute') {
                    rollData.attribute = itemData.itemId;
                } else {
                    let skill;
                    //let name = item.name;
                    name = game.i18n.localize(name);
                    if (typeof (itemData.itemId) !== 'undefined' && itemData.itemId !== '') {
                        skill = (actor as any).items.find((i: any) => i.type === itemData.subtype && i.id === itemData.itemId);
                    } else {
                        skill = (actor as any).items.find((i: any) => i.name === name);
                    }
                    if (skill !== null && typeof (skill) !== 'undefined' && typeof ((skill as any).system.score) !== 'undefined') {
                        if(OD6S.flatSkills) {
                            rollData.score = (+actorData.attributes[(skill as any).system.attribute.toLowerCase()].score);
                            flatPips = (+(skill as any).system.score);
                        } else {
                            if(this.system.isAdvancedSkill) {
                                rollData.score = (+(skill as any).system.score);
                            } else {
                                rollData.score = (+(skill as any).system.score) + (+actorData.attributes[(skill as any).system.attribute.toLowerCase()].score);
                            }
                        }
                    } else {
                        // Search compendia for the skill and use the attribute
                        // rollData.score = (+actorData.attributes['agi'].score);
                        skill = await od6sutilities._getItemFromWorld(name) as any;
                        if (skill !== null && typeof (skill) !== 'undefined') {
                            rollData.score = (+actorData.attributes[(skill as any).system.attribute.toLowerCase()].score);
                        } else {
                            skill = await od6sutilities._getItemFromCompendium(name) as any;
                            if (skill !== null && typeof (skill) !== 'undefined') {
                                rollData.score = (+actorData.attributes[(skill as any).system.attribute.toLowerCase()].score);
                            } else {
                                // Cannot find, use defaults for the type
                                for (const a in OD6S.actions) {
                                    if (OD6S.actions[a].type === itemData.subtype) {
                                        // @ts-expect-error
                                        rollData.score = (+this!.actor.system.attributes[OD6S.actions[a].base].score);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                break;
            }
        }

        if(item.type === 'starship-weapon' || item.type === 'vehicle-weapon') {
            if(item.system?.fire_control.score > 0) {
                rollData.score = (+rollData.score) + (+item.system.fire_control.score);
            }
        }

        let subtype = itemData.subtype;
        if (parry) {
            subtype = "parry";
        }

        if(flatPips > 0) {
            rollData.flatpips = flatPips;
        }

        rollData.name = item.name;
        rollData.type = item.type;
        rollData.actor = this.actor;
        rollData.itemId = item.id;
        rollData.subtype = subtype;

        await od6sroll._onRollDialog(rollData);
    }
}
