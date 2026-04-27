export class OD6SInitiative {
    static async _onPreUpdateCombat(combat: any, data: any, _options: any, _userId: any) {
        if(game.settings.get('od6s', 'reroll_initiative')) {

            if (!foundry.utils.hasProperty(data, "round")) return;
            if (data.round < 2 || data.round < combat.previous.round) return;
            const gmUsers = game.users.contents.filter(u => u.isGM);
            const gmUserId = game.user.isGM ? game.userId : gmUsers.length ? gmUsers[0].id : null;

            if (!gmUserId) return;
            await combat.resetAll();

            if (game.modules.get("dice-so-nice")?.active &&
                game.settings.get('od6s','auto_init_dsn')) {
                game.dice3d.messageHookDisabled=true;
            }

            if (game.settings.get('od6s','auto_reroll_npc') &&
                game.settings.get('od6s','auto_reroll_character')) {
                await combat.rollAll();
            } else {
                if (game.settings.get('od6s', 'auto_reroll_npc')) {
                    await combat.rollNPC()
                }

                if (game.settings.get('od6s', 'auto_reroll_character')) {
                    const characters = combat.combatants.filter((t: any) => t.actor.type === 'character').map((t: any) => t.id);
                    await combat.rollInitiative(characters);
                }
            }

            if (game.modules.get("dice-so-nice")?.active &&
                game.settings.get('od6s','auto_init_dsn')) {
                game.dice3d.messageHookDisabled=false;
            }
            await combat.update({turn: 0});
        }
    }
}