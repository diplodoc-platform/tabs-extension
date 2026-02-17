/**
 * Helpers for tab content: slug ids, keys, selected marker, and source map ranges.
 */
import type Token from 'markdown-it/lib/token';
import type {RuntimeTab} from '../types';

import GithubSlugger from 'github-slugger';

import {ACTIVE_TAB_TEXT} from '../../common';

const CUSTOM_ID_REGEXP = /\[?{ ?#(\S+) ?}]?/;

const sluggersStorage = new Map<string, GithubSlugger>();

function parseName(name: string): {name: string; customAnchor: string | null} {
    const parts = name.match(CUSTOM_ID_REGEXP);
    let customAnchor: string | null = null;
    let pure = name;

    if (parts) {
        pure = name.replace(parts[0], '');
        customAnchor = parts[1];
    } else {
        pure = name;
        customAnchor = null;
    }

    if (pure.includes(ACTIVE_TAB_TEXT)) {
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

    return name.includes(ACTIVE_TAB_TEXT);
}

/**
 * URL-encoded tab key used in state (localStorage, query).
 * @param tab - Runtime tab
 * @returns Encoded key
 */
export function getTabKey(tab: RuntimeTab): string {
    return encodeURIComponent(getRawId(tab)).toLocaleLowerCase();
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
