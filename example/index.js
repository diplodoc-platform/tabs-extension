import transform from '@doc-tools/transform';
import tabs from '@diplodoc/tabs-extension';

import {readFile} from 'node:fs/promises';

(async () => {
    const content = await readFile('./Readme.md', 'utf8');
    const {result} = await transform(content, {
        output: './build',
        plugins: [
            tabs.transform({
                bundled: true,
            }),
        ],
    });

    const html = `
<html>
    <head>
        ${result.meta.script.map((scriptFile) => `<script src="${scriptFile}"></script>`)}
        ${result.meta.style.map(
            (styleFile) => `<link rel="stylesheet" href="${styleFile}"></script>`,
        )}
    </head>
    <body>
        ${result.html}    
    </body>
</html>    
    `;

    console.log(html);
})();
