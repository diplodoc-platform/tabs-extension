import {TabsController} from './TabsController';

if (window && document && !window.diplodocTabs) {
    window.diplodocTabs = new TabsController(document);
}
