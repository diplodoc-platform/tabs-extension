import {TabsController} from '..';

declare global {
    interface Window {
        diplodocTabs: TabsController;
    }
}
