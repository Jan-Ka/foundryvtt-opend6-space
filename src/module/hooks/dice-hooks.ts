export function registerDiceHooks() {
    // Custom dice for DiceSoNice
    Hooks.on('diceSoNiceReady', (dice3d) => {
        dice3d.addSystem({id: 'od6s', name: "OpenD6 Space"}, "default")
        dice3d.addDicePreset({
            type: "dw",
            labels: [game.settings.get('od6s', 'wild_die_one_face'), "2", "3", "4", "5", game.settings.get('od6s', 'wild_die_six_face')],
            colorset: "white",
            values: {min: 1, max: 6},
            system: "od6s"
        }, "dw")
        dice3d.addDicePreset({
            type: "db",
            labels: ["1", "2", "3", "4", "5", "6"],
            colorset: "black",
            values: {min: 1, max: 6},
            system: "od6s"
        }, "db")
    })

    Hooks.on('diceSoNiceRollStart', (messageId, context) => {
        const message = game.messages.get(messageId);
        if (message!.getFlag('od6s','isExplosive') && message!.getFlag('od6s','triggered')) {
            context.blind=true;
        }
        const roll = context.roll;
        let die;
        const len = roll.dice.length;
        // Customize colors for Dice So Nice
        for (die = 0; die < len; die++) {
            switch (roll.dice[die].options.flavor) {
                case game.i18n.localize("OD6S.WILD_DIE_FLAVOR").includes(roll.dice[die].options.flavor):
                    roll.dice[die].options.colorset = "white";
                    break;
                case "CP":
                    roll.dice[die].options.colorset = "black";
                    break;
                case "Bonus":
                    roll.dice[die].options.colorset = "black";
                    break;
                default:
                    break;
            }
        }
    })
}
