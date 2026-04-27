declare const foundry: any;

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export default class OD6SItemInfo extends HandlebarsApplicationMixin(ApplicationV2) {

    object: any;

    constructor(object: any = {}, options: any = {}) {
        super(options);
        this.object = object;
    }

    static DEFAULT_OPTIONS = {
        id: "od6s-item-info",
        classes: ["od6s", "bordered", "boxed", "item-info-ok-button", "align-form-header", "align-center-header"],
        tag: "div",
        window: {
            title: "OD6S.ITEM_INFO",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 320,
            height: "auto",
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/item/item-info.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        return {object: this.object};
    }
}
