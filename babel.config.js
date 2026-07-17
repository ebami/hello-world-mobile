module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 (SDK 57) moved its Babel plugin into react-native-worklets;
    // it must be listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};
