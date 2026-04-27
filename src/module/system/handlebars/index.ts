/**
 * Barrel file — imports and calls all Handlebars helper registration functions.
 */
import {registerExplosiveHelpers} from "./explosives";
import {registerSkillHelpers} from "./skills";
import {registerDiceHelpers} from "./dice-helpers";
import {registerVehicleHelpers} from "./vehicle";
import {registerCombatHelpers} from "./combat";
import {registerConfigHelpers} from "./config-helpers";
import {registerDisplayHelpers} from "./display";
import {registerChatHelpers} from "./chat";

export function registerAllHelpers() {
    registerExplosiveHelpers();
    registerSkillHelpers();
    registerDiceHelpers();
    registerVehicleHelpers();
    registerCombatHelpers();
    registerConfigHelpers();
    registerDisplayHelpers();
    registerChatHelpers();
}
