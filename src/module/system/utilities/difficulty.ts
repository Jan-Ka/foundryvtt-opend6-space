import OD6S from "../../config/config-od6s";
import MersenneTwister from "mersenne-twister";

const twist = new MersenneTwister();

export async function getDifficultyFromLevel(level: string): Promise<number> {
    let difficulty;

    if (OD6S.randomDifficulty) {
        if (OD6S.difficulty[level].max === 0) {
            difficulty = 0;
        } else {
            if (game.settings.get('od6s', 'random_dice_difficulty')) {
                const dice = OD6S.difficulty[level].dice;
                const terms = dice + "D6";
                const roll = await new Roll(terms).evaluate();
                difficulty = roll.total;
            } else {
                let min = 0;
                const max = OD6S.difficulty[level].max;
                switch (level) {
                    case "OD6S.DIFFICULTY_VERY_EASY":
                        min = 1;
                        break;

                    case  "OD6S.DIFFICULTY_EASY":
                        min = OD6S.difficulty['OD6S.DIFFICULTY_VERY_EASY'].max + 1;
                        break;

                    case "OD6S.DIFFICULTY_MODERATE":
                        min = OD6S.difficulty['OD6S.DIFFICULTY_EASY'].max + 1;
                        break;

                    case "OD6S.DIFFICULTY_DIFFICULT":
                        min = OD6S.difficulty['OD6S.DIFFICULTY_MODERATE'].max + 1;
                        break;

                    case "OD6S.DIFFICULTY_VERY_DIFFICULT":
                        min = OD6S.difficulty['OD6S.DIFFICULTY_DIFFICULT'].max + 1;
                        break;

                    case "OD6S.DIFFICULTY_HEROIC":
                        min = OD6S.difficulty['OD6S.DIFFICULTY_VERY_DIFFICULT'].max + 1;
                        break;

                    case "OD6S.DIFFICULTY_LEGENDARY":
                        min = OD6S.difficulty['OD6S.DIFFICULTY_VERY_DIFFICULT'].max + 1;
                        break;

                    case 'default':
                        // Shouldn't be here
                        min = 1;
                }
                difficulty = Math.floor(twist.random() * (max - min + 1) + min);
            }
        }
    } else {
        difficulty = OD6S.difficulty[level].max;
    }

    return difficulty;
}

export function getDifficultyLevelSelect(): Record<string, string> {
    const levels: Record<string, string> = {};
    for (const i in OD6S.difficulty) {
        if (OD6S.difficulty[i].min > 0) {
            const level: Record<string, string> = {};
            level[i] = game.i18n.localize(i);
            Object.assign(levels, level);
        }
    }
    return levels;
}
