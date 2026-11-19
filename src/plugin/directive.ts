import type {
    BlockContentState,
    ContainerDirectiveParams,
    DirectiveBlockState,
    DirectiveInlineState,
    DirectiveParserHost,
} from '@diplodoc/directive';

import {
    directiveParser,
    registerContainerDirective,
    tokenizeBlockContent,
} from '@diplodoc/directive';

import {TabsVariants} from '../common';

export type TabsDirectiveDiagnostic = {line: number; reason: string};
export type TabsMarker =
    | {kind: 'open'; end: object; variant: TabsVariants; group?: string}
    | {kind: 'close'};

const OPEN = 'yfm_tabs_directive_open';
const CLOSE = 'yfm_tabs_directive_close';

function parseParams(
    params: ContainerDirectiveParams,
): {variant: TabsVariants; group?: string} | {reason: string} {
    if (params.inlineContent || params.contentTitle || params.dests) {
        return {reason: 'Tabs directives do not support a title or destination'};
    }
    const attrs = params.attrs ?? {};
    for (const name of Object.keys(attrs)) {
        if (name !== 'variant' && name !== 'group')
            return {reason: `Unknown tabs attribute: ${name}`};
        if (Array.isArray(attrs[name])) return {reason: `Repeated tabs attribute: ${name}`};
    }
    const rawVariant = attrs.variant ?? TabsVariants.Regular;
    const variant = Object.values(TabsVariants).find((candidate) => candidate === rawVariant);
    if (!variant) {
        return {reason: 'Invalid tabs variant'};
    }
    const group = attrs.group;
    if (group !== undefined && (typeof group !== 'string' || !group.trim())) {
        return {reason: 'Tabs group must be nonempty'};
    }
    return {variant, group};
}

export function installTabsDirective<
    B extends DirectiveBlockState & BlockContentState<B>,
    I extends DirectiveInlineState,
>(
    md: DirectiveParserHost<B, I>,
    markers: WeakMap<object, TabsMarker>,
    onDiagnostic?: (diagnostic: TabsDirectiveDiagnostic) => void,
): void {
    directiveParser()(md);
    registerContainerDirective(
        md,
        'tabs',
        (state, params) => {
            const parsed = parseParams(params);
            if ('reason' in parsed) {
                onDiagnostic?.({line: params.startLine + 1, reason: parsed.reason});
                return false;
            }
            const open = state.push(OPEN, '', 0);
            open.map = [params.startLine, params.endLine];
            tokenizeBlockContent(state, params.content, 'tabs-directive');
            const close = state.push(CLOSE, '', 0);
            close.map = [params.endLine - 1, params.endLine];
            markers.set(open, {kind: 'open', end: close, ...parsed});
            markers.set(close, {kind: 'close'});
            return true;
        },
        {onConflict: 'error'},
    );
}

export function validateTabsMarkers(
    tokens: readonly {type: string}[],
    markers: WeakMap<object, TabsMarker>,
): void {
    const expected: object[] = [];
    for (const token of tokens) {
        const marker = markers.get(token);
        if (!marker && (token.type === OPEN || token.type === CLOSE)) {
            throw new Error('Unowned tabs directive marker');
        }
        if (marker?.kind === 'open') expected.push(marker.end);
        else if (marker?.kind === 'close' && expected.pop() !== token) {
            throw new Error('Tabs directive opening marker is missing or crossed');
        }
    }
    if (expected.length) throw new Error('Tabs directive closing marker is missing');
}
