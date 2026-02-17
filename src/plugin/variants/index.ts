/**
 * Variant registry: maps TabsVariants to the function that generates HTML tokens for that variant.
 */
import type {TabsVariants} from '../../common';
import type {TabsTokensGenerator} from './types';

import {regular} from './regular';
import {radio} from './radio';
import {dropdown} from './dropdown';
import {accordion} from './accordion';

const generateByType: Record<TabsVariants, TabsTokensGenerator> = {
    regular,
    radio,
    dropdown,
    accordion,
};

/**
 * Returns the token generator for the given variant.
 * @param type - Variant name
 * @returns Generator function for that variant
 */
export const generateTokensByType = (type: TabsVariants): TabsTokensGenerator => {
    return generateByType[type];
};
