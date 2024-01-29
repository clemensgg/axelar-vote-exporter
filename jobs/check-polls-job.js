import { CronJob } from "cron";
import axelarscan, { setUnSubmittedVotes } from "../lib/axelarscan.js";
import db from "../services/database.js";
import settings from "../config/settings.js";
import { getMonikerByProxyAddress, getValidators } from "../services/validators.js";
import { getCurrentBlock } from "../lib/rpc.js";
import { pollStatusGauge, voteStatusGauge } from '../metrics/metrics.js';

export default function checkPollsJob() {
    let isRunning = false;
    const cronJob = new CronJob('*/30 * * * * *', async () => {
        if (isRunning) {
            console.log('checkPollsJob is already running.');
            return;
        }

        isRunning = true;
        try {
            console.log('checkPollsJob started.');

            await Promise.all([
                processVotes('mainnet'),
                processVotes('testnet'),
            ]);

            console.log('checkPollsJob finished.');
        } catch (error) {
            console.log('checkPollsJob got error', error);
        } finally {
            isRunning = false;
        }
    });
    cronJob.start();
}

async function processVotes(network = 'mainnet') {
    if (!settings.get('checkPolls-' + network)) {
        console.log(`[${network}] checkPolls is disabled`);
        return;
    }

    const polls = await axelarscan.getPolls(network);
    if (!polls) {
        console.log(`[${network}] polls not found.`);
        return;
    }

    const currentBlock = await getCurrentBlock(network);
    for (const poll of polls) {
        const pollStatus = poll.height + 20 > currentBlock ? 1 : poll.failed ? 4 : 2;
        pollStatusGauge.set({ poll_id: poll.id, tx_hash: poll.txHash }, pollStatus);

        const existsPoll = await db.getExistsPoll(poll.id, network);
        if (existsPoll) {
            continue;
        }

        const validators = await getValidators(network);
        setUnSubmittedVotes(poll, validators);

        console.log(`[${network}] poll ${poll.id} not exists. Saving...`);
        await db.savePoll(poll, network);

        const addresses = await db.getAddressesByNetwork(network);

        for (const vote of poll.votes) {
            const address = addresses.find(address => address.voterAddress === vote.voter);
            const moniker = await getMonikerByProxyAddress(vote.voter, network);
            const voteStatus = vote.unSubmitted ? 1 : vote.vote ? 2 : 4;
            voteStatusGauge.set({ poll_id: poll.id, tx_hash: poll.txHash, moniker, address }, voteStatus);
        }
    }
}
