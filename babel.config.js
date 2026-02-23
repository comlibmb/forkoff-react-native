module.exports = function (api) {
  api.cache(true);
  const plugins = ['react-native-reanimated/plugin'];

  // Strip console.log/warn/info/debug in production builds (keep console.error for Sentry)
  if (process.env.NODE_ENV === 'production' || process.env.EXPO_PUBLIC_APP_VARIANT === 'production') {
    plugins.push(['transform-remove-console', { exclude: ['error'] }]);
  }

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins,
  };
};
