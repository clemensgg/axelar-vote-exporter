import {PrismaClient} from "@prisma/client";

export const prisma = new PrismaClient();

export default {
    async getAddressesByNetwork(network) {
        return await prisma.address.findMany({
            where: {
                network: network,
            }
        });
    },
    async saveVote(voteData) {
        await prisma.vote.create({
            data: {
                voter: voteData.voter,
                vote: voteData.vote,
                unSubmitted: voteData.unSubmitted,
                poll: {
                    connect: { id: voteData.pollId }
                }
            }
        });
    },
    async getExistsPoll(pollId, network) {
        return await prisma.poll.findFirst({
            where: {
                pollId: pollId,
                network: network,
            }
        });
    },
    async savePoll(poll, network) {
        try {
            const savedPoll = await prisma.poll.create({
                data: {
                    pollId: poll.id,       
                    height: poll.height,   
                    network: network,      
                    chain: poll.chain,     
                    txHash: poll.txHash,   
                    success: poll.success, 
                    failed: poll.failed,  
                    votes: {
                        create: poll.votes.map(vote => ({
                            voter: vote.voter,
                            vote: vote.vote,
                            unSubmitted: vote.unSubmitted,
                        }))
                    },
                }
                });
                return savedPoll; 
        } catch (error) {
            console.error(`Error saving poll: ${error.message}`);
            return null;
        }
    },
    async getAddressVotes(address, network) {
        return await prisma.vote.findMany({
            take: 50,
            orderBy: {
                poll: {
                    pollId: 'desc',
                },
            },
            where: {
                voter: address,
                poll: {
                    network: network,
                }
            },
            select: {
                voter: true,
                vote: true,
                poll: {
                    select: {
                        pollId: true,
                        height: true,
                        chain: true,
                        txHash: true,
                        success: true,
                        failed: true,
                    }
                }
            }
        });
    },
    async getVotersStats(network) {
        const [yesVotes, noVotes, unSubmittedVotes, failedYesVotes, failednoVotes, failedUnSubmittedVotes] = await Promise.all([
            // yes votes
            prisma.vote.groupBy({
                by: ['voter'],
                where: {
                    vote: true,
                    poll: {
                        network: network,
                        failed: false,
                        success: true,
                    },
                },
                _count: {
                    vote: true,
                },
            }),

            // no votes
            prisma.vote.groupBy({
                by: ['voter'],
                where: {
                    vote: false,
                    unSubmitted: false,
                    poll: {
                        network: network,
                        failed: false,
                        success: true,
                    },
                },
                _count: {
                    vote: true,
                },
            }),

            // unSubmitted votes
            prisma.vote.groupBy({
                by: ['voter'],
                where: {
                    unSubmitted: true,
                    poll: {
                        network: network,
                        failed: false,
                        success: true,
                    },
                },
                _count: {
                    unSubmitted: true,
                },
            }),

            // failed yes votes
            prisma.vote.groupBy({
                by: ['voter'],
                where: {
                    vote: true,
                    poll: {
                        network: network,
                        failed: true,
                        success: false,
                    },
                },
                _count: {
                    vote: true,
                },
            }),

            // failed no votes
            prisma.vote.groupBy({
                by: ['voter'],
                where: {
                    vote: false,
                    unSubmitted: false,
                    poll: {
                        network: network,
                        failed: true,
                        success: false,
                    },
                },
                _count: {
                    vote: true,
                },
            }),

            // failed unSubmitted votes
            prisma.vote.groupBy({
                by: ['voter'],
                where: {
                    unSubmitted: true,
                    poll: {
                        network: network,
                        failed: true,
                        success: false,
                    },
                },
                _count: {
                    unSubmitted: true,
                },
            })
        ]);

        const voters = {};
        const processVotes = (votes, field, totalField = 'vote') => {
            for (const vote of votes) {
                if (!voters[vote.voter]) {
                    voters[vote.voter] = {
                        yes: 0,
                        no: 0,
                        unSubmitted: 0,
                        failedYes: 0,
                        failedNo: 0,
                        failedUnSubmitted: 0,
                    };
                }
                voters[vote.voter][field] = vote._count[totalField];
            }
        };

        processVotes(yesVotes, 'yes');
        processVotes(noVotes, 'no');
        processVotes(unSubmittedVotes, 'unSubmitted', 'unSubmitted');

        processVotes(failedYesVotes, 'failedYes');
        processVotes(failednoVotes, 'failedNo');
        processVotes(failedUnSubmittedVotes, 'failedUnSubmitted', 'unSubmitted');

        return Object.keys(voters).map(key => ({voter: key, ...voters[key]}));
    },
    async getRecentPolls(limit, network) {
        return await prisma.poll.findMany({
            where: {
                network: network,
            },
            take: limit,
            orderBy: {
                pollId: 'desc',
            },
        });
    },
    async getVotesForPoll(pollId) {
        const poll = await prisma.poll.findFirst({
            where: {
                pollId: pollId,
            },
        });
    
        if (!poll) {
            return [];
        }

        const votes = await prisma.vote.findMany({
            where: {
                pollId: poll.id, 
            },
        });
        return votes;
    },
    async getExistsVote(pollId, voter, network) {
        return await prisma.vote.findFirst({
            where: {
                pollId: pollId,
                voter: voter,
                poll: {
                    network: network,
                }
            }
        });
    },
    async updateVote(voteData) {
        await prisma.vote.updateMany({
            where: {
                pollId: voteData.pollId,
                voter: voteData.voter,
            },
            data: {
                vote: voteData.vote,
                unSubmitted: voteData.unSubmitted,
            }
        });
    },
}