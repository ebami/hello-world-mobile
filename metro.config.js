// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Watch the shared game-core package for changes
const gameCoreRoot = path.resolve(__dirname, 'packages', 'game-core');
config.watchFolders = [gameCoreRoot];

// Ensure proper resolution for web
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'];
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');

// Handle react-native-reanimated for web
// Prefer 'source' field so Metro resolves the TS source of workspace packages
config.resolver.resolverMainFields = ['source', 'react-native', 'browser', 'main'];

// Platform-specific extensions - web will use .web.ts files
config.resolver.platforms = ['ios', 'android', 'web'];

module.exports = config;
