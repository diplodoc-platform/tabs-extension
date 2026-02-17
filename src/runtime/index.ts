/**
 * Tabs runtime entry: creates a single TabsController for the document and attaches it to window
 * under GLOBAL_SYMBOL so that React and other consumers can access it. Imports SCSS for tab styles.
 */
import {GLOBAL_SYMBOL} from '../common';

import {TabsController} from './TabsController';
import './scss/tabs.scss';

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[GLOBAL_SYMBOL]) {
    window[GLOBAL_SYMBOL] = new TabsController(document);
}
