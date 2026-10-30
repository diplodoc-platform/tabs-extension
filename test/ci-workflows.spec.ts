// @vitest-environment node

import {readFileSync} from 'node:fs';
import {URL} from 'node:url';
import {describe, expect, it} from 'vitest';

function workflow(name: string) {
    return readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8');
}

describe('Secretless dependency CI contract', () => {
    it('binds the event candidate and reviewed Directive and File in an isolated metapackage', () => {
        const source = workflow('diplodoc-e2e-tests.yaml');
        expect(source).toContain('repository: diplodoc-platform/diplodoc');
        expect(source).toContain('ref: 81a7f4cc6772ebe4f3bc0cd51ac25b850c810cbd');
        expect(source).toContain('DIRECTIVE_SHA: c6b5d4c3f8d1cbe013c369efaa4545aa0a40f51b');
        expect(source).toContain("p.version !== '0.5.0-transform5.2'");
        expect(source).toContain('FILE_SHA: cd485ffbd63c860d77e9dcb6444aee62368f2783');
        expect(source).toContain("p.version !== '0.2.7-transform5.1'");
        expect(source).toContain('test "$(git -C extensions/file rev-parse HEAD)" = "$FILE_SHA"');
        expect(source).toContain('test "$(git rev-parse HEAD)" = "$METAPACKAGE_SHA"');
        expect(source).toContain(
            'test "$(git -C packages/directive rev-parse HEAD)" = "$DIRECTIVE_SHA"',
        );
        expect(source).toContain('E2E_CANDIDATE_REPOSITORY: ${{ github.repository }}');
        expect(source).toContain('E2E_CALLER_REPOSITORY: ${{ github.repository }}');
        expect(source).toContain(
            'E2E_CANDIDATE_SHA: ${{ github.event.pull_request.head.sha || github.sha }}',
        );
        expect(source).toContain(
            'E2E_EXPECTED_SHA: ${{ github.event.pull_request.head.sha || github.sha }}',
        );
        expect(source).toContain(
            'node --test scripts/e2e-candidate.test.js scripts/e2e-artifacts.test.js',
        );
        expect(source).toContain('node scripts/e2e-candidate.js');
        expect(source.indexOf('node scripts/e2e-candidate.js')).toBeLessThan(
            source.indexOf('Pin reviewed Directive source'),
        );
        expect(source.indexOf('Pin reviewed Directive source')).toBeLessThan(
            source.indexOf('Pin reviewed File source'),
        );
        expect(source.indexOf('Pin reviewed File source')).toBeLessThan(
            source.indexOf('Setup node_modules'),
        );
        expect(source).toContain('e2e-source.json');
        expect(source).toContain('e2e-directive-source.json');
        expect(source).toContain('e2e-file-source.json');
        expect(source).toContain('npm run build -- --verbose');
        expect(source).toContain('npm run test');
        expect(source).toContain('test-results');
        expect(source).toContain('contents: read');
        expect(source).not.toMatch(
            /secrets|pull_request_target|contents: write|gh workflow run|submodules_override/,
        );
    });

    it('preserves the required Run tests context and rejects unsuccessful E2E', () => {
        const source = workflow('diplodoc-e2e-tests.yaml');
        expect(source).toMatch(/name: Run tests\s+needs: parent-e2e\s+if: always\(\)/);
        expect(source).toContain('E2E_RESULT: ${{ needs.parent-e2e.result }}');
        expect(source).toContain('test "$E2E_RESULT" = success');
    });

    it('validates the Dependabot lockfile without scripts or writer credentials', () => {
        const source = workflow('package-lock.yml');
        const verify = source.split('  update-package-lock:')[0];
        expect(verify).toContain("if: github.event.pull_request.user.login == 'dependabot[bot]'");
        expect(verify).toContain('npm ci --no-workspaces --ignore-scripts');
        expect(verify).toContain('persist-credentials: false');
        expect(verify).not.toContain('secrets.');
        expect(source).toContain("github.event.pull_request.user.login != 'dependabot[bot]'");
        expect(source).toContain('name: Update package-lock.json');
        expect(source).toContain('test "$LOCK_RESULT" = success');
    });

    it('retains coverage tests and artifact while restricting Sonar for Dependabot authors', () => {
        const source = workflow('coverage.yml');
        expect(source).toContain('npm run test:coverage');
        expect(source).toContain('name: Upload coverage artifact');
        expect(source).toContain("github.event.pull_request.user.login != 'dependabot[bot]'");
        expect(source).toContain('Sonar upload is not run');
    });
});
