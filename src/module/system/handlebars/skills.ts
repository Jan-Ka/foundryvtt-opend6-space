/**
 * Skill-related Handlebars helpers.
 */
import OD6S from "../../config/config-od6s";
import {od6sutilities} from "../utilities";

export function registerSkillHelpers() {
    Handlebars.registerHelper('skillHasSpecs', function (actor, skill) {
        return actor.specializations.filter((s: any) => s.system.skill === skill.name).length > 0;
    })

    /**
     * Returns the world-level "skill used" rule flag. Templates use this to
     * conditionally render the per-skill / per-spec "used this session"
     * checkbox and the Reset Session button. When the rule is disabled, the
     * controls hide and `system.used.value` is not written to anywhere.
     */
    Handlebars.registerHelper('skillUsed', function () {
        return OD6S.skillUsed;
    });

    Handlebars.registerHelper('specializationDice', function () {
        return OD6S.specializationDice;
    });

    Handlebars.registerHelper('flatSkills', function () {
        return OD6S.flatSkills;
    })

    Handlebars.registerHelper('getTemplateSkills', function (data, _key) {
        if (typeof data.items !== 'undefined') {
            return data.items.filter((i: any) => i.type === 'skill');
        }
    });

    Handlebars.registerHelper('itemNotInTemplate', function (itemName, template) {
        if (typeof (template) !== 'undefined') {
            return !template.system.items.find((i: any) => i.name === itemName);
        } else {
            return true;
        }
    });

    Handlebars.registerHelper('getTemplateMetaphysicsSkills', function (data) {
        const templateSkills = od6sutilities.getSkillsFromTemplate(data.system.items);
        const metaSkills: any[] = [];
        for (const skill in templateSkills) {
            const foundSkill = od6sutilities.getItemByName((skill as any).name);
            if (typeof (foundSkill) !== "undefined") {
                if ((foundSkill as any).system.attribute === "met") {
                    metaSkills.push(foundSkill);
                }
            }
        }
    })

    Handlebars.registerHelper('isSkillOrAttribute', function (type, subtype) {
        if (typeof (type) === 'undefined') type = '';
        if (typeof (subtype) === 'undefined') subtype = '';

        return type === 'mortally_wounded' || type === 'incapacitated' || type === 'funds' || type === "skill" || subtype === "skill" ||
            type === "specialization" || subtype === "specialization" ||
            type === "attribute" || subtype === "attribute" || subtype === 'vehiclemaneuver';
    })
}
