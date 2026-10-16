// @vitest-environment node

import {readFileSync} from 'node:fs';
import {URL} from 'node:url';
import {describe, expect, it} from 'vitest';

function workflow(name: string) {
    return readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8');
}

describe('Secretless dependency CI contract', () => {
    it('keeps full E2E on an exact candidate SHA without a dispatch token', () => {
        const source = workflow('diplodoc-e2e-tests.yaml');
        expect(source).toContain(
            'uses: diplodoc-platform/diplodoc/.github/workflows/e2e-tests.yaml@master',
        );
        expect(source).toContain('candidate_repository: ${{ github.repository }}');
        expect(source).toContain(
            'candidate_sha: ${{ github.event.pull_request.head.sha || github.sha }}',
        );
        expect(source).toContain('contents: read');
        expect(source).not.toMatch(/secrets|pull_request_target|contents: write|gh workflow run/);
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
