/** No secret is placed in client configuration. This is the public app server origin. */
module.exports = ({ config }) => {
  const origin = process.env.EXPO_PUBLIC_APP_ORIGIN;
  if (!origin) return config;
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('EXPO_PUBLIC_APP_ORIGIN must be a bare HTTPS origin');
  }
  return { ...config, plugins: config.plugins.map(plugin => {
    const [name, options] = Array.isArray(plugin) ? plugin : [plugin, {}];
    return name === 'expo-router' ? [name, { ...options, origin: url.origin }] : plugin;
  }) };
};
