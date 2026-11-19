/** The token capabilities used to inspect and generate tab markup. */
export interface Token {
    type: string;
    content: string;
    level: number;
    nesting: number;
    map: [number, number] | null;
    markup: string;
    block: boolean;
    children: Token[] | null;
    attrSet(name: string, value: string): void;
    attrJoin(name: string, value: string): void;
}

/** The core state supplied by the host parser. */
export interface StateCore {
    env: Record<string | symbol, unknown>;
    tokens: Token[];
    Token: new (type: string, tag: string, nesting: -1 | 0 | 1) => Token;
}

/** The core rule registration capabilities required by Tabs. */
export interface MarkdownIt {
    core: {
        ruler: {
            before(beforeName: string, name: string, rule: (state: StateCore) => void): void;
            push(name: string, rule: (state: StateCore) => void): void;
        };
    };
}
