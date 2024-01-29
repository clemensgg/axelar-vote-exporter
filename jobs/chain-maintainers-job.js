import WebSocket from 'ws';
import { getChainMaintainers } from "../lib/rpc.js";
import { getWebsocketFromNetwork } from "../config/env.js";
import { getMonikerByOperatorAddress } from "../services/validators.js";
import settings from "../config/settings.js";
import { maintainerStatusGauge } from '../metrics/metrics.js';

export default function chainMaintainersJob() {
    process('mainnet');
    process('testnet');
}

function process(network = 'mainnet') {
    const websocketUrl = getWebsocketFromNetwork(network);
    if (!websocketUrl) {
        console.error(`Websocket url is not set for ${network}`);
        return;
    }

    connectWs(websocketUrl, network);
}

function connectWs(url, network) {
    let ws = new WebSocket(url);

    ws.on('open', () => {
        console.log(`[${network}] Websocket connected`);
        ws.send(JSON.stringify({
            "jsonrpc": "2.0",
            "method": "subscribe",
            "params": ["tm.event='NewBlock'"],
            "id": 2
        }));
    });

    ws.on('message', async (data) => {
        try {
            const dataJson = JSON.parse(data.toString());
            if (dataJson.result?.data?.value?.block?.header?.height) {
                const height = dataJson.result.data.value.block.header.height;
                console.log(`[${network}] new block height: ${height}`);

                await checkChainMaintainers(height, network);
            }
        } catch (error) {
            console.log(error);
        }
    });

    ws.on('error', (error) => {
        console.log(`[${network}] Websocket error: ${error}`);
    });

    ws.on('close', () => {
        console.log(`[${network}] Websocket closed try reconnecting...`);
        ws = null;
        setTimeout(() => connectWs(url, network), 1000);
    });
}

async function checkChainMaintainers(height, network = 'mainnet') {
    if (!settings.get('checkChainMaintainers-' + network)) {
        console.log(`[${network}] checkChainMaintainers is disabled`);
        return;
    }

    const chainMaintainers = await getChainMaintainers(height, network);
    if (!chainMaintainers) {
        return;
    }

    for (const chainMaintainer of chainMaintainers) {
        const moniker = await getMonikerByOperatorAddress(chainMaintainer.address, network);
        const status = chainMaintainer.action === "register" ? 1 : 0;
        maintainerStatusGauge.set({ chainmaintainer_chain: chainMaintainer.chain, moniker, address: chainMaintainer.address }, status);
    }
}
