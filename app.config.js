// Google Sign-In needs the iOS client's reversed ID as a URL scheme at build
// time, and its config plugin fails the build without it. Add the plugin only
// once EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set (the button is hidden until then).
module.exports = ({ config }) => {
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    if (!iosClientId) return config;

    const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`;
    return {
        ...config,
        plugins: [...config.plugins, ['@react-native-google-signin/google-signin', { iosUrlScheme }]],
    };
};
