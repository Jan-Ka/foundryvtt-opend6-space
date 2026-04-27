/**
 * Chat card Handlebars helpers.
 */
import OD6S from "../../config/config-od6s";

export function registerChatHelpers() {
    Handlebars.registerHelper('getChatTemplate', function (messageId) {
        // @ts-expect-error
        const messageType = game!.messages.get(messageId).getFlag('od6s', 'type')
        switch (messageType) {
            case "explosive":
                return OD6S.chatTemplates.explosive;
            case "range":
                return OD6S.chatTemplates.range;
            case "opposed":
                return OD6S.chatTemplates.opposed;
            case "damageresult":
                return OD6S.chatTemplates.damageresult;
            case "attribute":
            case "skill":
            case "specialization":
            case "weapon":
            case "starship-weapon":
            case "vehicle-weapon":
            case "action":
            case "damage":
            case "simple":
            case "resistance":
            case "funds":
            case "incapacitated":
            case "mortally_wounded":
                return OD6S.chatTemplates.roll;
            default:
                return OD6S.chatTemplates.generic;
        }
    })

    Handlebars.registerHelper('isCardVisible', function (message) {
        if (game.user.isGM) return true;
        return message.flags.od6s.isVisible;
    })

    Handlebars.registerHelper('getRollTypeForCard', function (type, subtype) {
        let label = '';
        switch (type) {
            case "weapon":
                switch (subtype) {
                    case "rangedattack":
                        label = "OD6S.CARD_RANGED_ATTACK";
                        break;
                    case "meleeattack":
                        label = "OD6S.CARD_MELEE_ATTACK";
                        break;
                    case "brawlattack":
                        label = "OD6S.CARD_BRAWL_ATTACK";
                        break
                    default:
                        // @ts-expect-error
                        create - attribute - column
                }
                break;
            case "action":
                switch (subtype) {
                    case "rangedattack":
                        label = "OD6S.CARD_RANGED_ATTACK";
                        break;
                    case "meleeattack":
                        label = "OD6S.CARD_MELEE_ATTACK";
                        break;
                    case "brawlattack":
                        label = "OD6S.CARD_BRAWL_ATTACK";
                        break;
                    case "dodge":
                        label = "OD6S.CARD_DODGE";
                        break;
                    case "parry":
                        label = "OD6S.CARD_PARRY";
                        break;
                    case "block":
                        label = "OD6S.CARD_BLOCK";
                        break;
                    default:
                }
                break;

            default:
        }
        return label;
    })
}
