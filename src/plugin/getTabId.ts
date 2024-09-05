import GithubSlugger from 'github-slugger';

import {ACTIVE_TAB_TEXT} from '../common';

import {Tab} from './transform';

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

export function getTabId(tab: Tab, {runId}: {runId: string}) {
    let slugger = sluggersStorage.get(runId);
    if (!slugger) {
        slugger = new GithubSlugger();
        sluggersStorage.set(runId, slugger);
    }

    return slugger.slug(getRawId(tab));
}

export function getTabKey(tab: Tab) {
    return encodeURIComponent(getRawId(tab)).toLocaleLowerCase();
}

export function getName(tab: Tab) {
    return parseName(tab.name).name;
}

function getRawId(tab: Tab): string {
    const {customAnchor, name} = parseName(tab.name);

    return customAnchor || name;
}
