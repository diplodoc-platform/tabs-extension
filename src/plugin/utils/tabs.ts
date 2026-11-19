import type {Token} from '../markdown-it';
/**
 * Helpers for tab content: slug ids, keys, selected marker, and source map ranges.
 */
import type {RuntimeTab} from '../types';

import GithubSlugger from 'github-slugger';

import {ACTIVE_TAB_TEXT} from '../../common';
import {createTabKey} from '../../tab-key';

const CUSTOM_ID_REGEXP = /\[?{ ?#(\S+) ?}]?/;

const sluggersStorage = new Map<string, GithubSlugger>();

function findCustomAnchor(name: string): RegExpMatchArray | null {
    return name.match(CUSTOM_ID_REGEXP);
}

function findSelected(name: string): number {
    return name.indexOf(ACTIVE_TAB_TEXT);
}

function parseName(name: string): {name: string; customAnchor: string | null} {
    const parts = findCustomAnchor(name);
    let customAnchor: string | null = null;
    let pure = name;

    if (parts) {
        pure = name.replace(parts[0], '');
        customAnchor = parts[1];
    } else {
        pure = name;
        customAnchor = null;
    }

    if (findSelected(pure) !== -1) {
        pure = pure.replace(ACTIVE_TAB_TEXT, '');
    }

    return {
        name: pure.trim(),
        customAnchor,
    };
}

/**
 * Generate a stable slug id for a tab (used in data-diplodoc-id and anchors).
 * @param tab - Runtime tab
 * @param runId - Plugin run id for slugger
 * @returns Slug string
 */
export function getTabId(tab: RuntimeTab, {runId}: {runId: string}): string {
    let slugger = sluggersStorage.get(runId);
    if (!slugger) {
        slugger = new GithubSlugger();
        sluggersStorage.set(runId, slugger);
    }

    return slugger.slug(getRawId(tab));
}

/**
 * True if the tab title contains the {selected} marker.
 * @param tab - Runtime tab
 * @returns Whether tab is selected by default
 */
export function isTabSelected(tab: RuntimeTab): boolean {
    const {name} = tab;

    return findSelected(name) !== -1;
}

export type TabSourceSpan = readonly [number, number];

export type TabNameMarkers = {
    readonly customAnchor: TabSourceSpan | null;
    readonly selectedForActivation: TabSourceSpan | null;
    readonly selectedForDisplay: TabSourceSpan | null;
};

function span(start: number, end: number): TabSourceSpan {
    return Object.freeze([start, end] as const);
}

/**
 * Identify the exact source ranges consumed by the owner name parser.
 * @param name - Original inline title content
 * @returns Markers or a refusal for a discontinuous marker
 */
export function observeTabName(
    name: string,
):
    | {readonly kind: 'ok'; readonly markers: TabNameMarkers}
    | {readonly kind: 'unsupported'; readonly reason: 'discontinuous-display-marker'} {
    const anchor = findCustomAnchor(name);
    const anchorStart = anchor?.index ?? -1;
    const anchorEnd = anchor ? anchorStart + anchor[0].length : -1;
    const withoutAnchor = anchor ? name.slice(0, anchorStart) + name.slice(anchorEnd) : name;
    const active = findSelected(name);
    const display = findSelected(withoutAnchor);
    const length = ACTIVE_TAB_TEXT.length;

    if (anchor && display !== -1 && display < anchorStart && display + length > anchorStart) {
        return Object.freeze({kind: 'unsupported', reason: 'discontinuous-display-marker'});
    }

    const displayStart = anchor && display >= anchorStart ? display + anchor[0].length : display;
    const markers = Object.freeze({
        customAnchor: anchor ? span(anchorStart, anchorEnd) : null,
        selectedForActivation: active === -1 ? null : span(active, active + length),
        selectedForDisplay: display === -1 ? null : span(displayStart, displayStart + length),
    });

    return Object.freeze({kind: 'ok', markers});
}

/**
 * Canonical slug key used in state (localStorage, query).
 * @param tab - Runtime tab
 * @returns Canonical slug key
 */
export function getTabKey(tab: RuntimeTab): string {
    return createTabKey(getRawId(tab));
}

/**
 * Tab title text without custom anchor and without {selected}.
 * @param tab - Runtime tab
 * @returns Display name
 */
export function getName(tab: RuntimeTab): string {
    return parseName(tab.name).name;
}

function getRawId(tab: RuntimeTab): string {
    const {customAnchor, name} = parseName(tab.name);

    return customAnchor || name;
}

/**
 * Source map range [startLine, endLine] for the tab content tokens, or null.
 * @param tokens - Content tokens
 * @returns [start, end] or null
 */
export function getContentMap(tokens: Token[]): [number, number] | null {
    let firstMap: [number, number] | null = null;
    let lastMap: [number, number] | null = null;

    tokens.forEach(({map}) => {
        if (map) {
            firstMap = firstMap ?? map;
            lastMap = map;
        }
    });

    return firstMap && lastMap ? [firstMap[0], lastMap[1]] : null;
}
