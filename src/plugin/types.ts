import Token from 'markdown-it/lib/token';

export type RuntimeTab = {
    name: string;
    tokens: Token[];
    listItem: Token;
};

export type TabsOrientation = 'radio' | 'horizontal' | 'dropdown';

export type TabsProps = {
    content: string;
    orientation: TabsOrientation;
    group: string;
};
