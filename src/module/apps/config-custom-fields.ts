import OD6S from "../config/config-od6s";

declare const foundry: any;

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export default class od6sCustomFieldsConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {

    requiresWorldReload = false;

    static DEFAULT_OPTIONS = {
        id: "od6s-custom-fields-configuration",
        classes: ["od6s", "settings-config"],
        tag: "form",
        window: {
            title: "OD6S.CONFIG_CUSTOM_FIELDS",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 600,
            height: "auto",
        },
        form: {
            handler: od6sCustomFieldsConfiguration.#onSubmit,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            closeForm: od6sCustomFieldsConfiguration.#onCloseForm,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/settings/custom-fields.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        const settings = Array.from(game.settings.settings)
            .filter((s: any) => s[1].od6sCustomField)
            .map((i: any) => i[1]);

        for (const s of settings) {
            s.inputType = s.type === Boolean ? "checkbox" : "text";
            s.choice = typeof s.choices !== "undefined";
            s.value = game.settings.get(s.namespace, s.key);
        }

        return {settings};
    }

    static async #onSubmit(
        this: od6sCustomFieldsConfiguration,
        _event: Event,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        const data = formData.object;
        for (const setting in data) {
            if (setting.includes("actor_types")) {
                let value = data[setting][0];
                for (const type in OD6S.actorMasks) {
                    value = data[setting].includes(type)
                        ? od6sCustomFieldsConfiguration.#updateActorTypes(value, type, true)
                        : od6sCustomFieldsConfiguration.#updateActorTypes(value, type, false);
                }
                await game.settings.set("od6s", setting, value);
            } else {
                await game.settings.set("od6s", setting, data[setting]);
            }
            const s = game.settings.settings.get("od6s." + setting);
            if (s?.requiresReload) this.requiresWorldReload = true;
        }
    }

    static #updateActorTypes(value: any, type: any, op: boolean): number {
        if (op) {
            value |= (1 << OD6S.actorMasks[type]);
        } else {
            value &= ~(1 << OD6S.actorMasks[type]);
        }
        return value;
    }

    static async #onCloseForm(this: od6sCustomFieldsConfiguration): Promise<void> {
        if (this.requiresWorldReload) {
            await SettingsConfig.reloadConfirm({world: true});
        }
        await this.close();
    }
}
