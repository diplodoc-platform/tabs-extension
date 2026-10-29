/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-unused-vars, no-void */
import MarkdownIt13 from 'markdown-it';
import MarkdownIt15 from 'markdown-it-transform15';

import {transform as createTabs} from '@diplodoc/tabs-extension';

const tabs = createTabs({
    bundle: false,
    features: {enabledVariants: {regular: true, radio: true, dropdown: true, accordion: true}},
});
type HostOptions = {output?: string; generateID: (value?: string) => string};
type Host13Callback = (md: InstanceType<typeof MarkdownIt13>, options: HostOptions) => void;
type Host15Callback = (md: InstanceType<typeof MarkdownIt15>, options: HostOptions) => void;
const host13: Host13Callback = tabs;
const host15: Host15Callback = tabs;
type Host15WithOptionalCollect = Host15Callback & {
    collect?: (
        input: string,
        options: {tokenStream: ReturnType<InstanceType<typeof MarkdownIt15>['parse']>},
    ) => string | void;
};
const optionalCollect: Host15WithOptionalCollect = tabs;
new MarkdownIt13().use(tabs);
new MarkdownIt15().use(tabs);
void [host13, host15, optionalCollect];
