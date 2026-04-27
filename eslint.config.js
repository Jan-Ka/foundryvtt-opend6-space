import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**', 'src/packs/**', 'scripts/**', 'src/lib/**', '**/*.js', '**/*.mjs'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        rules: {
            // Relax rules for existing codebase migration — tighten over time
            '@typescript-eslint/no-explicit-any': 'warn',      // ratchet for new code; ~178 existing sites
            '@typescript-eslint/no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],
            '@typescript-eslint/consistent-type-imports': ['warn', {
                prefer: 'type-imports',
                fixStyle: 'separate-type-imports',
            }],

            // Catch real bugs
            'no-constant-condition': 'warn',
            'no-constant-binary-expression': 'warn',
            'no-debugger': 'error',
            'no-duplicate-case': 'error',
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-fallthrough': 'warn',
            'no-unreachable': 'error',
            'no-useless-assignment': 'warn',
            'no-useless-escape': 'warn',
            'no-self-assign': 'warn',

            // Legacy code issues — warn for now, fix incrementally
            'no-cond-assign': 'warn',
            'no-case-declarations': 'warn',
            'no-prototype-builtins': 'warn',

            // Style — warn only, fix incrementally
            'prefer-const': 'warn',
            'no-var': 'warn',
            'eqeqeq': ['warn', 'smart'],
            'prefer-rest-params': 'off',          // Foundry API patterns
            'prefer-spread': 'off',               // Foundry API patterns

            // TypeScript-specific
            '@typescript-eslint/ban-ts-comment': 'off',         // migration uses @ts-expect-error
            '@typescript-eslint/no-unused-expressions': 'off', // ternaries used as statements
            '@typescript-eslint/no-this-alias': 'off',         // common pattern in Foundry
            '@typescript-eslint/no-require-imports': 'error',
        },
    },
    {
        // Test files can be looser
        files: ['src/**/*.test.ts'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },
);
