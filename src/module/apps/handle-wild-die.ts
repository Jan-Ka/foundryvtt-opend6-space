 
import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";


const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class OD6SHandleWildDieForm extends HandlebarsApplicationMixin(ApplicationV2) {

    messageId: string;

    constructor(event: any, options: any = {}) {
        super(options);
        this.messageId = event?.currentTarget?.dataset?.messageId ?? "";
    }

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-wild-die",
        classes: ["nonex-ist-od6s", "dialog"],
        tag: "form",
        window: {
            title: "NONEX_IST_OD6S.WILD_DIE",
            resizable: false,
            minimizable: true,
        },
        position: {
            width: 300,
            height: "auto",
        },
        form: {
            handler: OD6SHandleWildDieForm.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: true,
        },
        actions: {
            cancel: OD6SHandleWildDieForm.#onCancel,
        },
    };

    static PARTS = {
        form: {
            template: "systems/nonex-ist-od6s/templates/chat/wild-die.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        return {messageId: this.messageId};
    }

    static async #onSubmit(
        this: OD6SHandleWildDieForm,
        _event: Event,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        const data = formData.object;
        const message: any = game.messages.get(data.messageId);
        if (!message) return;

        switch (data.wilddie) {
            case "0":
                await message.setFlag("nonex-ist-od6s", "wild", false);
                break;
            case "1": {
                await message.setFlag("nonex-ist-od6s", "wildResult", "NONEX_IST_OD6S.REMOVE_HIGHEST_DIE");
                const replacementRoll = JSON.parse(JSON.stringify(message.rolls[0]));
                let highest = 0;
                for (let i = 0; i < replacementRoll.terms[0].results.length; i++) {
                    if (replacementRoll.terms[0].results[i].result
                        > replacementRoll.terms[0].results[highest].result) {
                        highest = i;
                    }
                }
                replacementRoll.terms[0].results[highest].discarded = true;
                replacementRoll.terms[0].results[highest].active = false;
                replacementRoll.total -= (+replacementRoll.terms[0].results[highest].result);

                if (message.getFlag("nonex-ist-od6s", "difficulty") && message.getFlag("nonex-ist-od6s", "success")) {
                    if (replacementRoll.total < (message.getFlag("nonex-ist-od6s", "difficulty") as number)) {
                        await message.setFlag("nonex-ist-od6s", "success", false);
                    }
                }

                await message.update({
                    id: message.id,
                    _id: message.id,
                    content: replacementRoll.total,
                    rolls: [replacementRoll],
                    system: {},
                }, {diff: true});
                break;
            }
            case "2":
                await message.setFlag("nonex-ist-od6s", "wildResult", "NONEX_IST_OD6S.COMPLICATION");
                break;
        }
        await message.setFlag("nonex-ist-od6s", "wildHandled", true);

        if (message.getFlag("nonex-ist-od6s", "isOpposable") && OD6S.autoOpposed
            && (message.getFlag("nonex-ist-od6s", "type") === "damage")
            || message.getFlag("nonex-ist-od6s", "type") === "resistance") {
            await od6sutilities.autoOpposeRoll(message);
        }

        if (message.getFlag("nonex-ist-od6s", "subtype") === "purchase" && message.getFlag("nonex-ist-od6s", "success")) {
            const seller: any = game.actors.get(message.getFlag("nonex-ist-od6s", "seller") as string);
            await seller.sheet._onPurchase(message.getFlag("nonex-ist-od6s", "purchasedItem"), message.speaker.actor);
        }
    }

    static async #onCancel(this: OD6SHandleWildDieForm): Promise<void> {
        await this.close();
    }
}
