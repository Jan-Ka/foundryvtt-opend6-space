import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['src/**/*.test.ts'],
                    environment: 'node',
                },
            },
            {
                test: {
                    name: 'domain',
                    include: ['tests/domain/**/*.test.ts'],
                    environment: 'node',
                },
            },
        ],
    },
});
