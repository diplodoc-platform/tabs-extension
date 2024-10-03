import {type TabsOrientation} from '../types';

import {regular} from './default';
import {radio} from './radio';
import {TabsTokensGenerator} from './types';

const generateByType: Record<TabsOrientation, TabsTokensGenerator> = {
    horizontal: regular,
    radio: radio,
    dropdown: undefined as never,
};

export const generateTokensByType = (type: TabsOrientation) => {
    return generateByType[type];
};
