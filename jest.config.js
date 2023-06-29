/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    moduleDirectories: ['node_modules', 'src'],
    transform: {
        '^.+\\.(j|t)s?$': ['ts-jest', {tsconfig: '<rootDir>/test/tsconfig.json'}],
    },
    transformIgnorePatterns: [],
};
