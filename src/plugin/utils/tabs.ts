import type Token from 'markdown-it/lib/token';

import GithubSlugger from 'github-slugger';

import {ACTIVE_TAB_TEXT} from '../../common';
import {RuntimeTab} from '../types';

const CUSTOM_ID_REGEXP = /\[?{ ?#(\S+) ?}]?/;

const sluggersStorage = new Map<string, GithubSlugger>();

function parseName(name: string) {
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

export function getTabId(tab: RuntimeTab, {runId}: {runId: string}) {
    let slugger = sluggersStorage.get(runId);
    if (!slugger) {
        slugger = new GithubSlugger();
        sluggersStorage.set(runId, slugger);
    }

    return slugger.slug(getRawId(tab));
}

export function isTabSelected(tab: RuntimeTab) {
    const {name} = tab;

    return name.includes(ACTIVE_TAB_TEXT);
}

export function getTabKey(tab: RuntimeTab) {
    return encodeURIComponent(getRawId(tab)).toLocaleLowerCase();
}

export function getName(tab: RuntimeTab) {
    return parseName(tab.name).name;
}

function getRawId(tab: RuntimeTab): string {
    const {customAnchor, name} = parseName(tab.name);

    return customAnchor || name;
}

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
