esbuild src/plugin/index.ts --outfile=plugin/index.js \
  --bundle --platform=node --minify \
    --external:markdown-it --external:node:* \
  --sourcemap
