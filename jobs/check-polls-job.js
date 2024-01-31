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
        let savedPoll;
        const existsPoll = await db.getExistsPoll(poll.id, network);

        if (existsPoll) {
            console.log(`[${network}] poll ${poll.id} already exists in the database. Updating votes...`);
            savedPoll = existsPoll;
        } else {
            const validators = await getValidators(network);
            setUnSubmittedVotes(poll, validators);

            savedPoll = await db.savePoll(poll, network);
            console.log(`[${network}] poll ${poll.id} saved with ID: ${savedPoll.id}. Saving votes...`);
        }

        // Update or save new votes
        for (const vote of poll.votes) {
            // Check if the vote already exists in the database
            const existsVote = await db.getExistsVote(savedPoll.id, vote.voter, network);

            if (existsVote) {
                // Update existing vote
                await db.updateVote({
                    pollId: savedPoll.id,
                    voter: vote.voter,
                    vote: vote.vote,
                    unSubmitted: vote.unSubmitted,
                    network: network
                });
            } else {
                // Save new vote
                await db.saveVote({
                    pollId: savedPoll.id,
                    voter: vote.voter,
                    vote: vote.vote,
                    unSubmitted: vote.unSubmitted,
                    network: network
                });
            }
        }
        console.log(`[${network}] Votes updated for poll ID: ${poll.id}`);
    }
}

