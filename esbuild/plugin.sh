esbuild src/plugin/index.ts --outfile=plugin/index.js \
  --bundle --platform=node \
  --sourcemap \
  --define:PACKAGE="\"$(node -pe "require('./package.json').name")\""
