// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure proper resolution for web
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'];
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');

// Handle react-native-reanimated for web
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Platform-specific extensions - web will use .web.ts files
config.resolver.platforms = ['ios', 'android', 'web'];

module.exports = config;
