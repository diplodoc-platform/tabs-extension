import type Token from 'markdown-it/lib/token';
import type {TabsVariants} from '../common';

export type RuntimeTab = {
    name: string;
    tokens: Token[];
    listItem: Token;
};

export type TabsProps = {
    content: string;
    orientation: TabsVariants;
    group: string;
};
