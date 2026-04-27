// System Settings - delegates to domain-specific modules in ./settings/
import {registerSettings, updateConfig, updateRerollInitiative} from "./settings/index";

export {updateRerollInitiative, updateConfig};

export {registerSettings};

export default function od6sSettings() {
    Hooks.once('init', async function () {
        await registerSettings();
    });
    Hooks.on('renderSettingsConfig', async function () {
        await registerSettings();
    });
    Hooks.once('i18nInit', async function () {
        await registerSettings();
    });
}
