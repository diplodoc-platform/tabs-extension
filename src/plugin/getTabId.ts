import GithubSlugger, {slug} from 'github-slugger';

import {Tab} from './transform';

const CUSTOM_ID_REGEXP = /\[?{ ?#(\S+) ?}]?/;

const sluggersStorage = new Map<string, GithubSlugger>();

const getCustomId = (name: string) => {
    const result = name.match(CUSTOM_ID_REGEXP);
    return result?.[1] || null;
};

export function getTabId(tab: Tab, {runId}: {runId: string}) {
    let slugger = sluggersStorage.get(runId);
    if (!slugger) {
        slugger = new GithubSlugger();
        sluggersStorage.set(runId, slugger);
    }

    return slugger.slug(getTabKey(tab));
}

export function getTabKey(tab: Tab) {
    return getCustomId(tab.name) || slug(tab.name);
}
