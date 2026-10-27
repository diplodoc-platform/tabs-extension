import type MarkdownItConstructor from 'markdown-it' with {'resolution-mode': 'import'};

/** Types follow the parser installed by the consumer, including its native types. */
export type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
export type Token = ReturnType<MarkdownIt['parse']>[number];
export type StateCore = InstanceType<MarkdownIt['core']['State']>;
