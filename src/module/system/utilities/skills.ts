import OD6S from "../../config/config-od6s";

/**
 * Search for a spec, skill, or attribute and return the score
 */
export function getScoreFromSkill(actor: Actor, spec: string, skill: string, attribute: string): number {
    let score = 0;
    let found = false;
    // Look for a spec, then a skill, then finally attribute
    if (typeof (spec) !== "undefined" && spec !== '') {
        const foundSpec = actor.items.find((s: Item) => s.name === spec && s.type === 'specialization');
        if (foundSpec) {
            score = foundSpec.system.score;
            found = true;
        }
    }
    if (!found && typeof (skill) !== "undefined" && skill !== '') {
        const foundSkill = actor.items.find((s: Item) => s.name === skill && s.type === 'skill');
        if (foundSkill) {
            score = foundSkill.system.score;
        }
    }
    score += actor.system.attributes[attribute.toLowerCase()].score;
    return score;
}

/**
 * Return the total sensor score based on skill
 */
export function getSensorTotal(actor: Actor, score: number): number {
    let skillName = '';
    if (actor.getFlag('od6s', 'crew')) {
        const sys = actor.system as OD6SCharacterSystem & { vehicle: { sensors?: { skill?: string } } };
        if (typeof (sys.vehicle.sensors?.skill) !== 'undefined'
            && sys.vehicle.sensors.skill !== '') {
            skillName = sys.vehicle.sensors.skill;
        }
    }
    if (skillName === '') {
        skillName = game.i18n.localize(OD6S.default_sensor_skill);
    }
    return (+score) + getScoreFromSkill(actor, '', skillName, 'mec');
}
