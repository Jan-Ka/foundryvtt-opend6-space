/**
 * Status effects displayed in the token HUD and applied via wound/stun automation.
 * Mounted onto `OD6S.statusEffects` by `config-od6s.ts`.
 */
const statusEffects = [
    {
        id: "dead",
        name: "EFFECT.StatusDead",
        img: "icons/svg/skull.svg"
    },
    {
        id: "unconscious",
        name: "EFFECT.StatusUnconscious",
        img: "icons/svg/unconscious.svg"
    },
    {
        id: "sleep",
        name: "EFFECT.StatusAsleep",
        img: "icons/svg/sleep.svg"
    },
    {
        id: "stunned",
        name: "EFFECT.StatusStunned",
        img: "icons/svg/daze.svg",
        hud: false
    },
    {
        id: "wounded",
        name: "EFFECT.StatusWounded",
        img: "systems/od6s/icons/wounded.svg",
        hud: false
    },
    {
        id: "severely_wounded",
        name: "EFFECT.StatusSeverelyWounded",
        img: "systems/od6s/icons/severely-wounded.svg",
        hud: false
    },
    {
        id: "incapacitated",
        name: "EFFECT.StatusIncapacitated",
        img: "systems/od6s/icons/incapacitated.svg",
        hud: false
    },
    {
        id: "mortally_wounded",
        name: "EFFECT.StatusMortallyWounded",
        img: "systems/od6s/icons/mortally-wounded.svg",
        hud: false
    },
    {
        id: "prone",
        name: "EFFECT.StatusProne",
        img: "icons/svg/falling.svg"
    },
    {
        id: "restrain",
        name: "EFFECT.StatusRestrained",
        img: "icons/svg/net.svg",
    },
    {
        id: "paralysis",
        name: "EFFECT.StatusParalysis",
        img: "icons/svg/paralysis.svg",
    },
    {
        id: "fly",
        name: "EFFECT.StatusFlying",
        img: "icons/svg/wing.svg",
    },
    {
        id: "blind",
        name: "EFFECT.StatusBlind",
        img: "icons/svg/blind.svg"
    },
    {
        id: "deaf",
        name: "EFFECT.StatusDeaf",
        img: "icons/svg/deaf.svg"
    },
    {
        id: "silence",
        name: "EFFECT.StatusSilenced",
        img: "icons/svg/silenced.svg"
    },
    {
        id: "fear",
        name: "EFFECT.StatusFear",
        img: "icons/svg/terror.svg"
    },
    {
        id: "burning",
        name: "EFFECT.StatusBurning",
        img: "icons/svg/fire.svg"
    },
    {
        id: "frozen",
        name: "EFFECT.StatusFrozen",
        img: "icons/svg/frozen.svg"
    },
    {
        id: "shock",
        name: "EFFECT.StatusShocked",
        img: "icons/svg/lightning.svg"
    },
    {
        id: "bleeding",
        name: "EFFECT.StatusBleeding",
        img: "icons/svg/blood.svg"
    },
    {
        id: "disease",
        name: "EFFECT.StatusDisease",
        img: "icons/svg/biohazard.svg"
    },
    {
        id: "poison",
        name: "EFFECT.StatusPoison",
        img: "icons/svg/poison.svg"
    },
    {
        id: "radiation",
        name: "EFFECT.StatusRadiation",
        img: "icons/svg/radiation.svg"
    },
    {
        id: "upgrade",
        name: "EFFECT.StatusUpgrade",
        img: "icons/svg/upgrade.svg"
    },
    {
        id: "downgrade",
        name: "EFFECT.StatusDowngrade",
        img: "icons/svg/downgrade.svg"
    },
    {
        id: "target",
        name: "EFFECT.StatusTarget",
        img: "icons/svg/target.svg"
    }
];

export default statusEffects;
