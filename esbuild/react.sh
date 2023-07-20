esbuild src/react/index.ts --outfile=react/index.js \
  --bundle --platform=neutral --target=es6 --format=cjs \
  --sourcemap \
  --external:react
