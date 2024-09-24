/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    transform: {
        '^.+\\.(j|t)s?$': ['ts-jest', {tsconfig: '<rootDir>/tsconfig.json'}],
    },
    transformIgnorePatterns: [],
    testEnvironment: 'jsdom',
    snapshotSerializers: ['jest-serializer-html'],
};
