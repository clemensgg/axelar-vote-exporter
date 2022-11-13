import WebSocket from 'ws';
import {getChainMaintainers} from "../lib/rpc.js";
import {getChannelIdFromNetwork, getWebsocketFromNetwork} from "../config/env.js";
import {prisma} from "../services/database.js";
import {sendMessage} from "../services/discord.js";

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

    const ws = new WebSocket(websocketUrl);

    ws.on('open', () => {
        console.log(`Websocket connection opened for ${network}`);
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
}

async function checkChainMaintainers(height, network = 'mainnet') {
    const chainMaintainers = await getChainMaintainers(height, network);
    if (!chainMaintainers) {
        return;
    }

    for (const chainMaintainer of chainMaintainers) {
        const address = await prisma.address.findFirst({
            where: {
                operatorAddress: chainMaintainer.address,
                network: network,
            }
        });

        if (!address) {
            continue;
        }

        const messageText = `Hey, <@${address.userIds.split(',')}>  ${chainMaintainer.action === "register" ? "REGISTER" : "DEREGISTER"} ${chainMaintainer.chain}`;
        await sendMessage(getChannelIdFromNetwork(network), messageText);
    }
}