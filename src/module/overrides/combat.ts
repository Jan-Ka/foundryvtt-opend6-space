import {od6sutilities} from "../system/utilities";

export class OD6SCombat extends Combat {

    /**
     * Advance the combat to the next round
     * @returns {Promise<Combat>}
     */
    async nextRound() {
        // Handle auto-explosive rolls if end-of-round is set
        if (game.settings.get('od6s', 'auto_explosive') && game.settings.get('od6s', 'explosive_end_of_round')) {
            await od6sutilities.detonateExplosives(this);
        }

        let turn = this.turn === null ? null : 0; // Preserve the fact that it's no-one's turn currently.
        if ( this.settings.skipDefeated && (turn !== null) ) {
            turn = this.turns.findIndex(t => !t.isDefeated);
            if (turn === -1) {
                ui.notifications.warn("COMBAT.NoneRemaining", {localize: true});
                turn = 0;
            }
        }
        let advanceTime = Math.max(this.turns.length - this.turn, 0) * CONFIG.time.turnTime;
        advanceTime += CONFIG.time.roundTime;
        const nextRound = this.round + 1;

        // Update the document, passing data through a hook first
        const updateData = {round: nextRound, turn};
        const updateOptions = {advanceTime, direction: 1};
        Hooks.callAll("combatRound", this, updateData, updateOptions);
        return this.update(updateData, updateOptions);
    }

}