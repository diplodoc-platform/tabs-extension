esbuild src/hooks/index.ts --outfile=hooks/index.js \
  --bundle --platform=neutral --target=es6 --format=cjs \
  --sourcemap \
  --external:react
