// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// React and React Native must be singletons. This is an npm workspace, and the
// repo root hoists react@18 / react-native@0.74 for the backend Expo apps —
// versions this app does not use. Any dependency that itself lives in the root
// node_modules resolves 'react' from there, so a second React gets pulled into
// this app's bundle. Two React runtimes fighting over the same globals surface
// as "TypeError: property is not writable" in setUpDefaltReactNativeEnvironment
// at startup. Always resolve these from THIS app, whatever asked for them.
const SINGLETON_ROOTS = ['react', 'react-dom', 'react-native', 'react-native-web'];
const isSingleton = (name) =>
  SINGLETON_ROOTS.some((p) => name === p || name.startsWith(`${p}/`));

// A stable origin inside this app, so resolution starts from its node_modules.
const projectOrigin = path.join(__dirname, 'index.js');

// Fix Metro's inability to resolve packages with .js extension in main field
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const ctx = isSingleton(moduleName)
    ? { ...context, originModulePath: projectOrigin }
    : context;

  try {
    if (originalResolveRequest) {
      return originalResolveRequest(ctx, moduleName, platform);
    }
    return ctx.resolveRequest(ctx, moduleName, platform);
  } catch (e) {
    // Try resolving with Node's require.resolve as fallback. Singletons resolve
    // from this app's root, never from the requiring module's directory.
    try {
      const from = isSingleton(moduleName)
        ? __dirname
        : path.dirname(context.originModulePath);
      const filePath = require.resolve(moduleName, { paths: [from] });
      return { filePath, type: 'sourceFile' };
    } catch (_) {
      throw e;
    }
  }
};

module.exports = config;
