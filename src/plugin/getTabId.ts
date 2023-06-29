import GithubSlugger from 'github-slugger';

import {Tab} from './transform';

const CUSTOM_ID_REGEXP = /\[?{ ?#(\S+) ?}]?/;

const slugger = new GithubSlugger();

const getCustomId = (name: string) => {
    const result = name.match(CUSTOM_ID_REGEXP);
    return result?.[1] || null;
};

export function getTabId(tab: Tab) {
    return getCustomId(tab.name) || slugger.slug(tab.name);
}
