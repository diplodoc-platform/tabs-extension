import type Token from 'markdown-it/lib/token';
import type {TabsVariants} from '../common';

/** Single tab parsed from list tokens: title text, inner tokens, and the list_item_open token. */
export type RuntimeTab = {
    name: string;
    tokens: Token[];
    listItem: Token;
};

/** Parsed attributes from `{% list tabs group=... %}` (variant and group id). */
export type TabsProps = {
    content: string;
    variant: TabsVariants;
    group: string;
};
