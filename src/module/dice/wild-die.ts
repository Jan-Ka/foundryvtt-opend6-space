export class WildDie extends foundry.dice.terms.Die {
    constructor(termData: any) {
        termData.faces = 6;
        termData.modifiers = ["x6"];
        super(termData);
    }

    static DENOMINATION = "w";
}
