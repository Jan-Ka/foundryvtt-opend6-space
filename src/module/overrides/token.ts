export class OD6SToken extends foundry.canvas.placeables.Token {

    /* Override */
    _canDrag(user: any, event: any) {
        if (!this.controlled) return false;
        if (!user.isGM && event.interactionData.object.actor?.type === 'container') return false;
        const tool = game.activeTool;
        if ((tool !== "select") || game.keyboard.isModifierActive(
            foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL
        )) return false;
        const blockMove = game.paused && !game.user.isGM;
        return !this._movement && !blockMove;
    }

    // drawEffects override removed — v14 Token API changed significantly.
    // The override's purpose (hiding status effects from non-owners) needs
    // to be reimplemented using v14's Token rendering hooks.
}
