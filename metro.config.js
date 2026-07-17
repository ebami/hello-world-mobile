// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Watch the shared game-core package for changes
const gameCoreRoot = path.resolve(__dirname, 'packages', 'game-core');
config.watchFolders = [gameCoreRoot];

// Extend (never replace) Expo's default source extensions so we don't drop
// any extension Expo's Metro config expects.
config.resolver.sourceExts = Array.from(
  new Set([...config.resolver.sourceExts, 'ts', 'tsx', 'cjs', 'mjs']),
);

// Resolve ONLY the workspace package @hello-world/game-core from its TypeScript
// source, so dev builds don't need a prior `build:core`. This is scoped to that
// one package on purpose: a global `resolverMainFields: ['source', ...]` also
// forces third-party deps to their `source` field, which breaks packages that
// declare `source` but publish only `dist` — e.g. react-native-is-edge-to-edge
// (pulled in by Reanimated 4), surfacing as a Metro "unable to resolve" on
// native. Everything else uses Expo's default field resolution.
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

const gameCoreEntry = path.resolve(gameCoreRoot, 'src', 'index.ts');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@hello-world/game-core') {
    return { type: 'sourceFile', filePath: gameCoreEntry };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
