import {TabsController} from '../TabsController';

declare global {
    interface Window {
        diplodocTabs: TabsController;
    }
}
