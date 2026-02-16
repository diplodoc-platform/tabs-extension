import {coverageConfigDefaults, defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: false,
        // Run test files sequentially so jsdom document is not shared/confused with plugin.spec
        fileParallelism: false,
        include: ['test/**/*.test.ts', 'test/**/*.spec.ts'],
        exclude: ['node_modules', 'build', 'tests'],
        snapshotFormat: {
            escapeString: true,
            printBasicPrototype: true,
        },
        coverage: {
            provider: 'v8',
            include: ['src/**'],
            exclude: ['test/**', 'tests/**', ...coverageConfigDefaults.exclude],
            reporter: ['text', 'json', 'html', 'lcov'],
        },
    },
});
