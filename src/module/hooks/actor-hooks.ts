import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";
import {od6sroll} from "../apps/roll";

export function registerActorHooks() {
    Hooks.on('preDeleteDocument', async (document, _options, _userId) => {
        if (['starship','vehicle'].includes(document.type)) {
            if (document.system.crewmembers.length > 0) {
                // Iterate through crew and disembark
                if(game.user.isGM) {
                    for (const c in document.system.crewmembers) {
                        const actor = await od6sutilities.getActorFromUuid(document.system.crewmembers[c].uuid);
                        if (!actor) continue;
                        await (actor as any).removeFromCrew(document.uuid);
                    }
                }
            }
        }

        if (['character','npc','creature'].includes(document.type)) {
            if (typeof document.system.vehicle.uuid !== 'undefined' && document.system.vehicle.uuid !== '') {
                if (game.user.isGM) {
                    const vehicle = await od6sutilities.getActorFromUuid(document.system.vehicle.uuid);
                    if (vehicle) await (vehicle as any).forceRemoveCrewmember(document.uuid);
                }
            }
        }
    })

    Hooks.on("preUpdateActor", async (document, change, _options, _userId) => {
        if (change.system?.wounds && change.system.wounds.value > document.system.wounds.value) {
            if (game.settings.get('od6s', 'bodypoints') === 0) {
                const status = OD6S.woundsId[od6sutilities.getWoundLevel(change.system.wounds.value, document)];
                if (status === 'stunned') {
                    change.system.stuns = {};
                    change.system.stuns.value = document.system.stuns.value + 1;
                    document.system.stuns.current < 1 ? change.system.stuns.current = 1 : change.system.stuns.current = document.system.stuns.current;
                    change.system.stuns.rounds = 1;
                } else {
                    if (document.system.stuns.current < 1) {
                        change.system.stuns = {};
                        change.system.stuns.current = 0;
                        change.system.stuns.rounds = 0;
                    }
                }
            }
      } else if (change.system?.wounds && change.system.wounds.value < document.system.wounds.value) {
            const status = OD6S.woundsId[od6sutilities.getWoundLevel(change.system.wounds.value, document)];
            if (status === 'healthy') {
                change.system.stuns = {};
                change.system.stuns.value = 0;
                change.system.stuns.rounds = 0;
            }
        }
    })

    Hooks.on("updateActor", async (document, change, _options, _userId) => {
        if ((document.type === "vehicle" || document.type === "starship") && document.system.crewmembers.length > 0) {
            await document.sendVehicleData();
        }

        if(change.system?.stuns?.value) {
            if(game.settings.get('od6s','track_stuns')) {
                if (game.user.isGM) {
                    if (document.system.stuns.value >= od6sutilities.getDiceFromScore(document.system.attributes.str.score).dice) {
                        // Actor has become unconscious
                        const roll = await new Roll("2d6").evaluate();
                        const flavor = document.name +
                            game.i18n.localize('OD6S.CHAT_UNCONSCIOUS_01') +
                            roll.total +
                            game.i18n.localize('OD6S.CHAT_UNCONSCIOUS_02');
                        await roll.toMessage({flavor: flavor});

                        await document.toggleStatusEffect('unconscious', {overlay: false, active: true});
                    }
                }
            }
        }

        if (change.system?.wounds?.value) {
            if(game.settings.get('od6s','auto_status')) {
                const status = OD6S.woundsId[od6sutilities.getWoundLevel(change.system.wounds.value, document)];
                if ((document.hasPlayerOwner && document.isOwner)) {
                    if (game.user.isGM) {
                        for (const s in OD6S.woundsId) {
                            const id = OD6S.woundsId[s];
                            if (id === 'healthy') continue;
                            await document.toggleStatusEffect(id, {overlay: false, active: false});
                        }

                        if (status !== 'healthy') {
                            await document.toggleStatusEffect(status, {overlay: false, active: true});
                        }
                    }

                    if (status === 'healthy') {
                        await document.unsetFlag('od6s', 'mortally_wounded');
                    } else if (status === 'stunned') {
                        // Apply stunned flag
                        if (document.getFlag('od6s', 'mortally_wounded') !== 'undefined') {
                            await document.unsetFlag('od6s', 'mortally_wounded');
                        }
                    } else if (status === 'wounded') {
                        if (document.getFlag('od6s', 'mortally_wounded') !== 'undefined') {
                            await document.unsetFlag('od6s', 'mortally_wounded');
                        }
                    } else if (status === 'severely_wounded') {
                        if (document.getFlag('od6s', 'mortally_wounded') !== 'undefined') {
                            await document.unsetFlag('od6s', 'mortally_wounded');
                        }
                    } else if (status === 'incapacitated') {
                        if (document.getFlag('od6s', 'mortally_wounded') !== 'undefined') {
                            await document.unsetFlag('od6s', 'mortally_wounded');
                        }

                        if (game.settings.get('od6s', 'auto_incapacitated')) {
                            const rollData = {
                                name: game.i18n.localize('OD6S.RESIST_INCAPACITATED'),
                                actor: document,
                                score: document.system.attributes.str.score,
                                type: 'incapacitated',
                                difficultylevel: 'OD6S.DIFFICULTY_MODERATE'
                            }
                            await od6sroll._onRollDialog(rollData);
                        } else {
                            await document.applyIncapacitatedFailure();
                        }
                    } else if (status === 'mortally_wounded') {
                        await document.setFlag('od6s', 'mortally_wounded', 0)
                    }


                } else if (!document.hasPlayerOwner && game.user.isGM) {
                    for (const s in OD6S.woundsId) {
                        const id = OD6S.woundsId[s];
                        if (id === 'healthy') continue;
                        await document.toggleStatusEffect(id, {overlay: false, active: false});
                    }

                    if (status !== 'healthy') {
                        await document.toggleStatusEffect(status, {overlay: false, active: true});
                    }

                    const tokens = document.getActiveTokens(true, false);
                    for (const token of tokens) {
                        if (status === 'stunned') {
                            // Apply stunned flag
                            if (token.actor.getFlag('od6s', 'mortally_wounded') !== 'undefined') {
                                await token.actor.unsetFlag('od6s', 'mortally_wounded');
                            }
                        } else if (status === 'wounded') {
                            if (token.actor.getFlag('od6s', 'mortally_wounded') !== 'undefined') {
                                await token.actor.unsetFlag('od6s', 'mortally_wounded');
                            }
                        } else if (status === 'severely_wounded') {
                            if (token.actor.getFlag('od6s', 'mortally_wounded') !== 'undefined') {
                                await token.actor.unsetFlag('od6s', 'mortally_wounded');
                            }
                        } else if (status === 'incapacitated') {
                            if (token.actor.getFlag('od6s', 'mortally_wounded') !== 'undefined') {
                                await token.actor.unsetFlag('od6s', 'mortally_wounded');
                            }

                            const rollData = {
                                name: game.i18n.localize('OD6S.RESIST_INCAPACITATED'),
                                actor: token.actor,
                                score: token.actor.system.attributes.str.score,
                                type: 'incapacitated',
                                difficultylevel: 'OD6S.DIFFICULTY_MODERATE'
                            }
                            await od6sroll._onRollDialog(rollData);
                        } else if (status === 'mortally_wounded') {
                            await token.actor.setFlag('od6s', 'mortally_wounded', 1)
                        }
                    }
                }
            }
        }
    })

    Hooks.on("updateToken", async (document, _change, _options, _userId) => {
        if ((document.type === "vehicle" || document.type === "starship")
            && document.system.crewmembers.length > 0 && !document.system?.embedded_pilot) {
            await document.sendVehicleData();
        }
    })

    Hooks.on("preDeleteToken", async (document, _change, _options, _userId) => {
        if (document.actor.type === 'vehicle' || document.actor.type === 'starship') {
            if (document.actor.system.crew.value > 0) {
                for (let i = 0; i < document.actor.system.crewmembers.length; i++) {
                    const crewMember = await od6sutilities.getActorFromUuid(document.actor.system.crewmembers[i].uuid);
                    if (crewMember) {
                        try {
                            (crewMember as any).removeFromCrew(document.actor.uuid);
                        } catch {
                            // Likely the other token was simultaneously deleted
                        }
                    }
                }
            }
        } else {
            if (document.actor.getFlag('od6s', 'crew') !== '') {
                const vehicle = await od6sutilities.getActorFromUuid(document.actor.getFlag('od6s', 'crew'));
                if (vehicle) {
                    try {
                        await (vehicle as any).forceRemoveCrewmember(document.actor.uuid);
                    } catch {
                        // Likely the other token was simultaneously deleted
                    }
                }
            }
        }
    })

    Hooks.on("renderActorSheet", async (sheet) => {
        if ((sheet.actor.type === "vehicle" || sheet.actor.type === "starship") && sheet.actor.system.crewmembers.length > 0) {
            await sheet.actor.sendVehicleData();
        }
    })

    Hooks.on('updateActiveEffect', async (effect) => {
        await od6sutilities.handleEffectChange(effect);
    })

    Hooks.on('deleteActiveEffect', async (effect) => {
        if(effect.statuses.has('stunned')) {
            const update: any = {};
            update.system = {};
            update.system.stuns = {};
            update.system.stuns.current = 0;
            //update.system.stuns.value = effect.target.system.stuns.value ? effect.target.system.stuns.value - 1 : 0;
            await effect.target.update(update);
        }
        await od6sutilities.handleEffectChange(effect);
    })

    Hooks.on("canvasReady", async () => {
        //Loop through all vehicle actors/tokens and sync vehicle data
        if (game.user.isGM) {
            if (typeof (game.scenes.active && game.scenes.active.tokens.size > 0) !== 'undefined') {
                for (const t in game.scenes.active.tokens) {
                    if (['starship','vehicle'].includes(game.scenes?.active.tokens[t].type)) {
                        await game.scenes?.active.tokens[t].sendVehicleData();
                    }
                }
            }
        }
    })
}
