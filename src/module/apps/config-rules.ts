/**
 * config-rules — ApplicationV2 pilot.
 *
 * V2 PATTERN (replicate this for the other 12 config forms):
 *
 *   1. extend HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)
 *   2. static DEFAULT_OPTIONS replaces v1's `defaultOptions` getter; window
 *      title goes under `window.title`, dimensions under `position`, form
 *      handler/submitOnChange/closeOnSubmit under `form`. There is no
 *      `submitOnClose` in v2 — handle final submit via the close action.
 *   3. static PARTS declares the template parts. For a single-part form,
 *      one entry named "form" works.
 *   4. _prepareContext replaces v1's `getData()` (must be async).
 *   5. The form handler is a static function declared in DEFAULT_OPTIONS.form.handler;
 *      it receives (event, form, formData). `formData.object` holds the parsed values.
 *   6. Action buttons declare `data-action="X"` in the template; map to handlers
 *      via DEFAULT_OPTIONS.actions.X.
 *
 * Templates can no longer use {{#select}} or {{checked}} — those v1 helpers
 * were removed in v14. Use {{selectOptions}}, {{#each}} with
 * `{{#if (eq key X)}}selected{{/if}}`, or conditional `checked` instead.
 * See settings-v2.html.
 */

declare const foundry: any;

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export default class od6sRulesConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {

    requiresWorldReload = false;

    static DEFAULT_OPTIONS = {
        id: "od6s-rules-configuration",
        classes: ["od6s", "settings-config"],
        tag: "form",
        window: {
            title: "OD6S.CONFIG_RULES_OPTIONS_MENU",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 600,
            height: "auto",
        },
        form: {
            handler: od6sRulesConfiguration.#onSubmit,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            closeForm: od6sRulesConfiguration.#onCloseForm,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/settings/settings-v2.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        const settings = Array.from(game.settings.settings)
            .filter((s: any) => s[1].od6sRules)
            .map((i: any) => i[1]);

        for (const s of settings) {
            s.inputType = s.type === Boolean ? "checkbox" : "text";
            s.choice = typeof s.choices !== "undefined";
            s.value = game.settings.get(s.namespace, s.key);
        }

        return {settings};
    }

    static async #onSubmit(
        this: od6sRulesConfiguration,
        _event: Event,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        const data = formData.object;
        for (const setting in data) {
            await game.settings.set("od6s", setting, data[setting]);
            const s = game.settings.settings.get("od6s." + setting);
            if (s?.requiresReload) this.requiresWorldReload = true;
        }
    }

    static async #onCloseForm(this: od6sRulesConfiguration): Promise<void> {
        if (this.requiresWorldReload) {
            await SettingsConfig.reloadConfirm({world: true});
        }
        await this.close();
    }
}
