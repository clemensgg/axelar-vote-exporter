import 'dotenv/config';

export const MainnetRpc = process.env.MAINNET_RPC || "https://rpc-axelar.imperator.co:443";
export const TestnetRpc = process.env.TESTNET_RPC || "https://axelartest-rpc.quickapi.com:443";
export const MainnetLcd = process.env.MAINNET_LCD || "https://lcd-axelar.imperator.co:443";
export const TestnetLcd = process.env.TESTNET_LCD || "https://axelartest-lcd.quickapi.com:443";
export const MainnetNoVotePercentage = process.env.MAINNET_NO_VOTE_PERCENTAGE || 60;
export const TestnetNoVotePercentage = process.env.TESTNET_NO_VOTE_PERCENTAGE || 60;
export const MetricsPort = process.env.METRICS_PORT || 3009;
export const MonikerRegex = process.env.MONIKER_REGEX || "CryptoCrew"

export function getChannelIdFromNetwork(network) {
    if (network === 'mainnet') {
        return MainnetChannelId;
    } else if (network === 'testnet') {
        return TestnetChannelId;
    }

    return null;
}

export function getWebsocketFromNetwork(network) {
    if (network === 'mainnet') {
        return MainnetWebsocket;
    } else if (network === 'testnet') {
        return TestnetWebsocket;
    }

    return null;
}

export function getRpcFromNetwork(network) {
    if (network === 'mainnet') {
        return MainnetRpc;
    } else if (network === 'testnet') {
        return TestnetRpc;
    }

    return null;
}

export function getLcdFromNetwork(network) {
    if (network === 'mainnet') {
        return MainnetLcd;
    } else if (network === 'testnet') {
        return TestnetLcd;
    }

    return null;
}

export function getNoVotePercentageFromNetwork(network) {
    if (network === 'mainnet') {
        return isNaN(parseInt(MainnetNoVotePercentage)) ? 60 : MainnetNoVotePercentage;
    } else if (network === 'testnet') {
        return isNaN(parseInt(TestnetNoVotePercentage)) ? 60 : TestnetNoVotePercentage;
    }

    return 60;
}

export function getMetricsPort() {
    return MetricsPort;
}

export function getMonikerRegex() {
    return MonikerRegex;
}