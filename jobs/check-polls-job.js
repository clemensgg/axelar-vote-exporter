import { CronJob } from "cron";
import axelarscan, { setUnSubmittedVotes } from "../lib/axelarscan.js";
import db from "../services/database.js";
import settings from "../config/settings.js";
import { getValidators } from "../services/validators.js";

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

    
    for (const poll of polls) {
        // const currentBlock = await getCurrentBlock(network);
        // poll.status = poll.height + 20 > currentBlock ? 1 : poll.failed ? 4 : 2;
        // pollStatusGauge.set({ poll_id: poll.id, tx_hash: poll.txHash }, pollStatus);

        const existsPoll = await db.getExistsPoll(poll.id, network);
        if (existsPoll) {
            console.log(`[${network}] poll ${poll.id} already exists in the database.`);
            continue;
        }

        const validators = await getValidators(network);
        setUnSubmittedVotes(poll, validators);

        console.log(`[${network}] poll ${poll.id} does not exist. Attempting to save...`);
        const savedPoll = await db.savePoll(poll, network);
        console.log(`[${network}] poll ${poll.id} saved with ID: ${savedPoll.id}`);

//        const addresses = await db.getAddressesByNetwork(network);

        for (const vote of poll.votes) {
            console.log(`[${network}] Saving vote for poll ID: ${poll.id}`);
            await db.saveVote({
                pollId: savedPoll.id,
                voter: vote.voter,
                vote: vote.vote,
                unSubmitted: vote.unSubmitted,
                network: network
            });
            console.log(`[${network}] Vote saved for poll ID: ${poll.id}`);
        }
    }
}

