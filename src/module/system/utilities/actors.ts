import OD6S from "../../config/config-od6s";

/**
 * Get an actor document from a UUID
 */
export async function getActorFromUuid(uuid: string): Promise<Actor | undefined> {
    const document = await fromUuid(uuid);
    let actor: Actor | undefined;

    if (document === null || !(document?.documentName === 'Actor' || document?.documentName === 'Token')) {
        // Try getting an actor with id instead of uuid
        actor = game.actors.get(uuid);
        if (typeof (actor) !== 'undefined' && actor !== null) {
            return actor;
        } else {
            // Try getting a token
            actor = game.scenes!.active!.tokens.get(uuid)?.actor;
            if (typeof (actor) === 'undefined' || actor === null) {
                return;
            }
        }
    } else if (document.actor?.isToken || document.documentName === 'Token') {
        actor = game!.scenes!.active!.tokens.get(document.id)!.actor;
    } else {
        actor = game.actors.get(document.id);
    }

    return actor;
}

export async function getTokenFromUuid(uuid: string): Promise<TokenDocument | undefined> {
    const document = await fromUuid(uuid);
    if (document === null || document.documentName !== 'Actor') return;
    return game.scenes.viewed.tokens.get(document.token.id);
}

export function getActorOwner(actor: Actor): User | undefined {
    // @ts-expect-error getProperty is a Foundry VTT global
    const permissionObject = getProperty(actor ?? {}, "ownership") ?? {};

    const playerOwners = Object.entries(permissionObject)
        .filter(
            ([id, level]) =>
                !game.users.get(id)?.isGM && (game.users.get(id) as any)?.active && level === 3
        )
        .map(([id]) => id);

    if (playerOwners.length > 0) {
        return game.users.get(playerOwners[0]);
    } else {
        // default to GM
        return game.users.activeGM;
    }
}

export function getActiveAttributes(): string[] {
    const attr = [];
    for (const attribute in OD6S.attributes) {
        if (OD6S.attributes[attribute].active) {
            attr.push(attribute);
        }
    }
    return attr;
}

export function getActiveAttributesSelect(): Record<string, string> {
    const list = getActiveAttributes();
    const names: Record<string, string> = {};
    for (let a = 0; a < list.length; a++) {
        const key = list[a];
        if (typeof (OD6S.attributes[key].name) !== 'undefined') {
            names[key] = OD6S.attributes[key].name;
        }
    }
    return names;
}
