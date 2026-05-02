import {registerAllHelpers} from "./handlebars/index";

export default function od6sHandlebars() {
    Hooks.once('init', async function () {
        registerAllHelpers();
        await loadHandleBarTemplates();
    });
}

async function loadHandleBarTemplates() {
    const charPath = "systems/od6s/templates/actor/character/";
    const charTabPath = charPath + "tabs/";
    const containerPath = "systems/od6s/templates/actor/container/";
    const commonPath = "systems/od6s/templates/actor/common/";
    const commonTabPath = commonPath + "tabs/";
    const npcPath = "systems/od6s/templates/actor/npc/";
    const npcTabPath = npcPath + "tabs/";
    const creaturePath = "systems/od6s/templates/actor/creature/";
    const creatureTabPath = creaturePath + "tabs/";
    const vehiclePath = "systems/od6s/templates/actor/vehicle/";
    const vehicleTabPath = vehiclePath + "tabs/";
    const starshipPath = "systems/od6s/templates/actor/starship/";
    const starshipTabPath = starshipPath + "tabs/";
    const chatPath = "systems/od6s/templates/chat/";
    const itemPath = "systems/od6s/templates/item/";

    const templatePaths = [
        charTabPath + "biography.html",
        charTabPath + "attributes.html",
        charTabPath + "inventory.html",
        charTabPath + "metaphysics.html",
        commonTabPath + "attribute-column.html",
        commonTabPath + "cybernetics.html",
        commonTabPath + "special-abilities.html",
        commonTabPath + "combat.html",
        commonTabPath + "data.html",
        commonTabPath + "vehicle.html",
        commonTabPath + "description.html",
        commonTabPath + "cargo-hold.html",
        npcTabPath + "main.html",
        creatureTabPath + "main.html",
        chatPath + "generic.html",
        chatPath + "roll.html",
        chatPath + "opposed.html",
        chatPath + "damageresult.html",
        chatPath + "explosive.html",
        chatPath + "explosive-button.html",
        chatPath + "range.html",
        itemPath + "item-effects.html",
        itemPath + "item-labels-tags.html",
        charPath + "body-sheet.html",
        charPath + "header-sheet.html",
        charPath + "create-character-template.html",
        charPath + "create-character-skills.html",
        charPath + "create-attribute-column.html",
        charPath + "create-attribute-column-custom.html",
        charPath + "create-skill-column.html",
        commonPath + "wounds.html",
        commonPath + "sheet-mode.html",
        containerPath + "body-sheet.html",
        containerPath + "header-sheet.html",
        npcPath + "header-sheet.html",
        npcPath + "body-sheet.html",
        creaturePath + "header-sheet.html",
        creaturePath + "body-sheet.html",
        vehiclePath + "body-sheet.html",
        vehiclePath + "header-sheet.html",
        vehicleTabPath + "main.html",
        vehicleTabPath + "data.html",
        starshipPath + "body-sheet.html",
        starshipPath + "header-sheet.html",
        starshipTabPath + "main.html",
        starshipTabPath + "data.html",
    ];
    return foundry.applications.handlebars.loadTemplates(templatePaths);
}
