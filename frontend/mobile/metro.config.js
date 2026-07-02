// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix Metro's inability to resolve packages with .js extension in main field
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  } catch (e) {
    // Try resolving with Node's require.resolve as fallback
    try {
      const filePath = require.resolve(moduleName, {
        paths: [path.dirname(context.originModulePath)],
      });
      return { filePath, type: 'sourceFile' };
    } catch (_) {
      throw e;
    }
  }
};

module.exports = config;
