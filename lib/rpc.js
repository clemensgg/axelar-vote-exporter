import axios from "axios";
import {getRpcFromNetwork, getLcdFromNetwork} from "../config/env.js";
import pRetry from "p-retry";

export async function getCurrentBlock(network) {
    const response = await request(getRpcFromNetwork(network) + '/block');
    return parseInt(response.data.result.block.header.height);
}

export async function getPollIsFailed(height, network) {
    const response = await request(getRpcFromNetwork(network) + `/block_results?height=${height}`);
    const dataStr = JSON.stringify(response.data);

    return dataStr.includes("POLL_STATE_FAILED") || dataStr.includes("POLL_STATE_EXPIRED");
}

export async function getChains(network) {
    const lcdUrl = getLcdFromNetwork(network) + `/axelar/evm/v1beta1/chains`;
    const response = await request(lcdUrl);

    const chains = response?.data?.chains || [];
    return chains;
}

export async function getChainMaintainers(chain, network) {
    const lcdUrl = getLcdFromNetwork(network) + `/axelar/nexus/v1beta1/chain_maintainers/${chain}`;
    const response = await request(lcdUrl);
    console.log(response);
    const maintainerAddresses = response?.data?.maintainers || [];

    return maintainerAddresses;
}

async function request(url) {
    return await pRetry(() => axios.get(url), {
        retries: 5,
        onFailedAttempt: error => {
            console.log(`${url} Request failed.  ${error.retriesLeft} retries left`);
        }
    });
}