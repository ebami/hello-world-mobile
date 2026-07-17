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

// Prefer the 'source' field so Metro resolves the TS source of workspace
// packages (game-core) directly.
config.resolver.resolverMainFields = ['source', 'react-native', 'browser', 'main'];

module.exports = config;
