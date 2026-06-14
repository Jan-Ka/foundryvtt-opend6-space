 

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export default class OD6SItemInfo extends HandlebarsApplicationMixin(ApplicationV2) {

    object: any;

    constructor(object: any = {}, options: any = {}) {
        super(options);
        this.object = object;
    }

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-item-info",
        classes: ["nonex-ist-od6s", "bordered", "boxed", "item-info-ok-button", "align-form-header", "align-center-header"],
        tag: "div",
        window: {
            title: "NONEX_IST_OD6S.ITEM_INFO",
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
            template: "systems/nonex-ist-od6s/templates/item/item-info.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        return {object: this.object};
    }
}
