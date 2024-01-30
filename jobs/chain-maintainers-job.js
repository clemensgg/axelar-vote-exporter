import { getChains, getChainMaintainers } from "../lib/rpc.js";
import { getValidators } from "../services/validators.js";
import settings from "../config/settings.js";
import { maintainerStatusGauge } from '../metrics/metrics.js';

export async function fetchChainMaintainers(network = 'mainnet') {
    const chains = await getChains(network);
    chains.forEach(async (chain) => {
        await checkChainMaintainers(chain, network);
    });
}

async function checkChainMaintainers(chain, network = 'mainnet') {
    if (!settings.get('checkChainMaintainers-' + network)) {
        console.log(`[${network}] checkChainMaintainers is disabled`);
        return;
    }

    const chainMaintainers = await getChainMaintainers(chain, network);
    if (!chainMaintainers) {
        console.log(`[${network}] No maintainers found for chain: ${chain}`);
        return;
    }

    const validators  = await getValidators(network);

    for (const validator of validators) {
        const isRegistered = chainMaintainers.includes(validator.operator_address);
        const moniker = validator.description.moniker;
        const status = isRegistered ? 1 : 0; // 1 for registered, 0 for not registered
        maintainerStatusGauge.set({ evm_chain: chain, moniker, address: validator.operator_address }, status);
    }
}