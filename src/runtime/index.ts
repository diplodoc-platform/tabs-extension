import {TabsController} from './TabsController';

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.diplodocTabs) {
    window.diplodocTabs = new TabsController(document);
}
