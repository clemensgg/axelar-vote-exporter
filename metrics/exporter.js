import db from '../services/database.js';
import { fetchChainMaintainers } from '../jobs/chain-maintainers-job.js'
import { voteStatusGauge, pollStatusGauge } from './metrics.js';
import { getMonikerByProxyAddress } from "../services/validators.js";
import { getMonikerRegex } from "../config/env.js";

export async function exportMetrics() {
    // Export Maintainer Status
    await fetchChainMaintainers();

    // Export Poll Status
    const recentPolls = await db.getRecentPolls(100);
    for (const poll of recentPolls) {
        pollStatusGauge.set({
            evm_chain: poll.chain,
            poll_id: poll.pollId, 
            tx_hash: poll.txHash
        }, poll.failed ? 2 : (poll.success ? 1 : 0)); // 0 for pending, 1 for confirmed, 2 for failed

        // Export Vote Status
        const votes = await db.getVotesForPoll(poll.pollId); 
        for (const vote of votes) {
            // const address = await db.getAddress({ voterAddress: vote.voter }, poll.network);
            const moniker = await getMonikerByProxyAddress(vote.voter);

            // match your Moniker here to prevent high metric cardinality
            if (getMonikerRegex !== '') {
                if (moniker.includes(getMonikerRegex())) {
                    voteStatusGauge.set({
                        evm_chain: poll.chain,
                        poll_id: poll.pollId, 
                        tx_hash: poll.txHash,
                        moniker,
                        address: vote.voter
                    }, vote.vote ? 1 : (vote.unSubmitted ? 0 : 2)); // 0 for no vote, 1 for yes, 2 for no
                }
            } 
            // else {
            //     voteStatusGauge.set({
            //         poll_id: poll.pollId, 
            //         tx_hash: poll.txHash,
            //         moniker,
            //         address: vote.voter
            //     }, vote.vote ? 1 : (vote.unSubmitted ? 0 : 2)); // 0 for no vote, 1 for yes, 2 for no
            // }
        }
    }
}
