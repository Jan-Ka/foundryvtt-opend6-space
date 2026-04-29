const fields = foundry.data.fields;

/**
 * Skill / specialization shared progression fields.
 *
 * Score-field convention (consumers must follow):
 *   - `base + mod`     → own progression in pips. Persisted; reset by
 *                        `applyMods()`.
 *   - `score`          → derived `base + mod`. Roll-formula consumers read
 *                        this and add the linked attribute themselves.
 *   - `system.total`   → derived display value (`base + mod + attribute`,
 *                        respecting flatSkills + advanced-skill rules).
 *                        Populated by `prepareDerivedActorData()` via
 *                        `computeSkillDisplayScore()`. Templates and
 *                        roll-dialog `data-score` reads consume `total`,
 *                        not `score`.
 *
 * `total` is not declared here — it's a runtime-only derivation written by
 * the actor's prepare pass, not a persisted schema field.
 */
export function skillFieldsSchema() {
  return {
    attribute: new fields.StringField({ initial: "" }),
    min: new fields.BooleanField({ initial: false }),
    base: new fields.NumberField({ initial: 0 }),
    mod: new fields.NumberField({ initial: 0 }),
    score: new fields.NumberField({ initial: 0 }),
    time_taken: new fields.StringField({ initial: "One Round" }),
    isAdvancedSkill: new fields.BooleanField({ initial: false }),
    used: new fields.SchemaField({
      value: new fields.BooleanField({ initial: false }),
    }),
  };
}
