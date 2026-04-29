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
        (this.system as unknown as Record<string, unknown>).config = OD6S;
    }

    prepareBaseData() {
        super.prepareBaseData();
    }

    /**
     * Create derived data for the item
     */
    prepareDerivedData() {
        if (this.type === 'skill' || this.type === 'specialization') {
            const sys = this.system as OD6SSkillItemSystem;
            sys.score = (+sys.base) + (+sys.mod);
        }
        if (this.type === 'starship-weapon' || this.type === 'vehicle-weapon') {
            const sys = this.system as OD6SVehicleWeaponItemSystem & {
                stats: { attribute: string; skill: string; specialization: string };
                subtype: string;
            };
            sys.stats = {} as typeof sys.stats;
            sys.stats.attribute = sys.attribute.value;
            sys.stats.skill = sys.skill.value;
            sys.stats.specialization = sys.specialization.value;
            sys.subtype = 'vehiclerangedweaponattack';
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
            const sys = this.system as OD6SSkillItemSystem;
            sys.score = (+sys.base) + (+sys.mod);
        }
    }

    getScore() {
        if (this.type.match(/^(skill|specialization)/)) {
            if (this.actor) {
                const sys = this.system as OD6SSkillItemSystem;
                const actorSys = this.actor.system as OD6SCharacterSystem;
                if (sys.isAdvancedSkill) {
                    return sys.score;
                } else {
                    return actorSys.attributes[sys.attribute.toLowerCase()].score + sys.score;
                }
            }
        }
        if (this.type.match(/weapon/)) {
            if (this.actor) {
                const sys = this.system as OD6SWeaponItemSystem & { fire_control?: { score: number } };
                const actorSys = this.actor.system as OD6SCharacterSystem;
                let score = actorSys.attributes[sys.stats.attribute.toLowerCase()].score;
                const spec = this.actor.items.find(i => i.name === sys.stats.specialization && i.type === 'specialization');
                if (typeof spec !== 'undefined') {
                    if (typeof sys.fire_control !== 'undefined' && (sys.fire_control?.score as unknown) !== '') {
                        score = score + sys.fire_control.score;
                    }
                    return score + (spec.system as OD6SSpecializationItemSystem).score;
                } else {
                    const skill = this.actor.items.find(i => i.name === sys.stats.skill && i.type === 'skill');
                    if (typeof skill !== 'undefined') {
                        if (typeof sys.fire_control !== 'undefined' && (sys.fire_control?.score as unknown) !== '') {
                            score = score + sys.fire_control.score;
                        }
                        return score + (skill.system as OD6SSkillItemSystem).score;
                    }
                }
                if (typeof sys.fire_control?.score !== 'undefined' && (sys.fire_control?.score as unknown) !== '') {
                    score = score + sys.fire_control.score;
                }
                return score;
            }
        }
    }

    getScoreText() {
        return od6sutilities.getTextFromDice(od6sutilities.getDiceFromScore(this.getScore() ?? 0))
    }

    getParryText() {
        if (this.type === 'weapon') {
            if (this.actor) {
                const sys = this.system as OD6SWeaponItemSystem;
                if (sys.stats.parry_specialization !== '') {
                    const spec = this.actor.items.find(s => s.name === sys.stats.parry_specialization && s.type === 'specialization');
                    if (typeof spec !== 'undefined') return spec.getScoreText();
                }
                if (sys.stats.parry_skill !== '') {
                    if(this.actor) {
                        const skill = this.actor.items.find(s=>s.name === sys.stats.parry_skill && s.type === 'skill' );
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
        if (!this.actor) return;
        const actor = this.actor;
        const actorData = actor.system as OD6SCharacterSystem & Record<string, any>;
        const itemData = item.system;
        let flatPips = 0;

        const rollData: any = {};
        rollData.token = this.parent.sheet.token;

        switch (item.type) {
            case 'skill':
            case 'specialization': {
                const sys = itemData as OD6SSkillItemSystem;
                if (OD6S.flatSkills) {
                    rollData.score = +(actorData.attributes[sys.attribute.toLowerCase()].score);
                    flatPips = (+sys.score)
                } else {
                    if (sys.isAdvancedSkill) {
                        rollData.score = (+sys.score);
                    } else {
                        rollData.score = (+sys.score) + actorData.attributes[sys.attribute.toLowerCase()].score;
                    }
                }
                break;
            }
            case 'starship-weapon':
            case 'vehicle-weapon':
            case 'weapon': {
                const sys = itemData as OD6SWeaponItemSystem;
                // Try a specialization first, then a skill, then an attribute
                let found = false;

                if (parry && game.settings.get('od6s','parry_skills')) {
                    let skill;
                    if(typeof(sys.stats.parry_specialization) !== "undefined" && sys.stats.parry_specialization !== "") {
                        skill = actor.items.find((skill: Item) => skill.name === sys.stats.parry_specialization && skill.type === 'specialization');
                    }
                    else if(typeof(sys.stats.parry_skill) !== "undefined" && sys.stats.parry_skill !== "") {
                    	skill = actor.items.find((skill: Item) => skill.name === sys.stats.parry_skill && skill.type === 'skill');
                     } else {
                    	skill = actor.items.find((skill: Item) => skill.name === game.i18n.localize(OD6S.actions.parry.skill) && skill.type === 'skill');
                    }
                    if (skill) {
                        const skillSys = skill.system as OD6SSkillItemSystem;
                        if(OD6S.flatSkills) {
                            rollData.score = (+actorData.attributes[skillSys.attribute.toLowerCase()].score);
                            flatPips = (+skillSys.score);
                        } else {
                            rollData.score = (+skillSys.score) + (+actorData.attributes[skillSys.attribute.toLowerCase()].score);
                        }
                    } else {
                        rollData.score = actorData.attributes[OD6S.actions.parry.base.toLowerCase()].score;
                    }
                    found = true;
                }

                if (!found && sys.stats.specialization !== null) {
                    const spec = actor.items.find((spec: Item) => spec.name === sys.stats.specialization && spec.type === 'specialization');                    if (spec) {
                        const specSys = spec.system as OD6SSpecializationItemSystem;
                        if(OD6S.flatSkills) {
                            rollData.score = (+actorData.attributes[specSys.attribute.toLowerCase()].score);
                            flatPips = (+specSys.score);
                        } else {
                            rollData.score = (+specSys.score) + (+actorData.attributes[specSys.attribute.toLowerCase()].score);
                        }
                        found = true;
                    }
                }
                if (!found) {
                    // See if the actor has the associated skill
                    const skill = actor.items.find((skill: Item) => skill.name === sys.stats.skill && skill.type === 'skill');
                    let attr = actorData.attributes[sys.stats.attribute.toLowerCase()];
                    if(typeof(attr?.score) === "undefined" || attr === null) {
                        // See if it maps to the "shortname" of a custom attribute label
                        // @ts-expect-error
                        attr = actorData.attributes[od6sutilities.lookupAttributeKey(sys.stats.attribute.toLowerCase())];
                        if(typeof(attr?.score) === "undefined" || attr === null) return false;
                    }
                    if (typeof (skill) !== 'undefined' && skill !== null) {
                        const skillSys = skill.system as OD6SSkillItemSystem;
                        if(OD6S.flatSkills) {
                            rollData.score = (+attr.score);
                            flatPips = (+skillSys.score);
                        } else {
                            rollData.score = (+skillSys.score) + (+attr.score);
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
                const sys = itemData as OD6SActionItemSystem;
                let name = '';
                if ((sys.subtype === 'rangedattack' || sys.subtype === 'meleeattack') && sys.itemId !== '') {
                    // Roll is linked to an inventory item, roll that instead
                    const targetItem = actor.items.find((i: Item) => i.id === sys.itemId);
                    return targetItem?.roll(parry);
                }

                if (sys.subtype === 'dodge' || sys.subtype === 'parry' || sys.subtype === 'block') {
                    // Get the appropriate skill or attribute
                    switch (sys.subtype) {
                        case 'dodge':
                            name = 'OD6S.DODGE';
                            break;
                        case 'parry':
                            if (actor.items.find((i: Item) => i.id === sys.itemId)) {
                                const targetItem = actor.items.find((i: Item) => i.id === sys.itemId);
                                return targetItem?.roll(true);
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

                if (sys.subtype === 'attribute') {
                    rollData.attribute = sys.itemId;
                } else {
                    let skill;
                    //let name = item.name;
                    name = game.i18n.localize(name);
                    if (typeof (sys.itemId) !== 'undefined' && sys.itemId !== '') {
                        skill = actor.items.find((i: Item) => i.type === sys.subtype && i.id === sys.itemId);
                    } else {
                        skill = actor.items.find((i: Item) => i.name === name);
                    }
                    const skillSys = skill?.system as OD6SSkillItemSystem | undefined;
                    if (skill !== null && typeof (skill) !== 'undefined' && typeof (skillSys?.score) !== 'undefined') {
                        if(OD6S.flatSkills) {
                            rollData.score = (+actorData.attributes[skillSys!.attribute.toLowerCase()].score);
                            flatPips = (+skillSys!.score);
                        } else {
                            if((this.system as OD6SSkillItemSystem).isAdvancedSkill) {
                                rollData.score = (+skillSys!.score);
                            } else {
                                rollData.score = (+skillSys!.score) + (+actorData.attributes[skillSys!.attribute.toLowerCase()].score);
                            }
                        }
                    } else {
                        // Search compendia for the skill and use the attribute
                        skill = (await od6sutilities._getItemFromWorld(name)) as Item | undefined;
                        if (skill !== null && typeof (skill) !== 'undefined') {
                            rollData.score = (+actorData.attributes[(skill.system as OD6SSkillItemSystem).attribute.toLowerCase()].score);
                        } else {
                            skill = (await od6sutilities._getItemFromCompendium(name)) as Item | undefined;
                            if (skill !== null && typeof (skill) !== 'undefined') {
                                rollData.score = (+actorData.attributes[(skill.system as OD6SSkillItemSystem).attribute.toLowerCase()].score);
                            } else {
                                // Cannot find, use defaults for the type
                                for (const a in OD6S.actions) {
                                    if (OD6S.actions[a].type === (itemData as OD6SActionItemSystem).subtype) {
                                        rollData.score = (+actorData.attributes[OD6S.actions[a].base].score);
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
            const sys = item.system as OD6SVehicleWeaponItemSystem;
            if(sys?.fire_control.score > 0) {
                rollData.score = (+rollData.score) + (+sys.fire_control.score);
            }
        }

        let subtype = (itemData as OD6SActionItemSystem).subtype;
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
