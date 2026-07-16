import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo configuration (MFP-07).
 *
 * The static base lives in `app.json`; Expo passes it in as `config` and this
 * function layers environment-driven values on top:
 *  - iOS / Android identifiers from protected build variables (never invented
 *    company identifiers committed to source),
 *  - the EAS project id,
 *  - the resolved environment + release version exposed via `extra`.
 *
 * Only non-secret, build-time values appear here. Server secrets
 * (SESSION_SIGNING_KEY, ERROR_REPORTING_DSN) are never referenced.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = process.env.EXPO_PUBLIC_ENVIRONMENT ?? 'development';
  const releaseVersion =
    process.env.EXPO_PUBLIC_RELEASE_VERSION ?? config.version ?? '1.0.0';

  return {
    ...config,
    name: config.name ?? 'hello-world-mobile',
    slug: config.slug ?? 'hello-world-mobile',
    ios: {
      ...config.ios,
      ...(process.env.IOS_BUNDLE_IDENTIFIER
        ? { bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER }
        : {}),
    },
    android: {
      ...config.android,
      ...(process.env.ANDROID_PACKAGE ? { package: process.env.ANDROID_PACKAGE } : {}),
    },
    extra: {
      ...config.extra,
      environment,
      releaseVersion,
      ...(process.env.EAS_PROJECT_ID
        ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
        : {}),
    },
  };
};
