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

export const generateTokensByType = (type: TabsVariants) => {
    return generateByType[type];
};
