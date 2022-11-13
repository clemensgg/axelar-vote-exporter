import {Client, EmbedBuilder, Events, GatewayIntentBits} from "discord.js";
import _ from "lodash";
import {MainnetChannelId, TestnetChannelId} from "../config/env.js";
import {getVoterAddress} from "../helpers/voter.js";
import {setupJobs} from "../jobs/index.js";
import {deleteAddress, getAddress, getAddressVotes, saveAddress} from "./database.js";
import {getPoll} from "../lib/axelarscan.js";
import {getMonikerByProxyAddress} from "./validators.js";


export const discord = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,]});

export async function sendMessage(channelId, message) {
    try {
        const channel = await discord.channels.fetch(channelId);
        await channel.send(message);
    } catch (error) {
        console.log('sendMessage error', error);
    }
}

export async function setupDiscord(discordBotToken) {
    discord.on(Events.ClientReady, () => {
        console.log(`Logged in as ${discord.user.tag}!`);

        setupJobs();
    });

    discord.on(Events.MessageCreate, async message => {
            const channelId = message.channelId;

            if (channelId !== MainnetChannelId && channelId !== TestnetChannelId) {
                return;
            }

            const channelNetwork = channelId === MainnetChannelId ? 'mainnet' : 'testnet';


            if (message.content.startsWith('$help')) {
                const messageStr =
                    'Hello, I am a bot that will notify you of any changes in your voting status.\n' +
                    'To check bot is working, type `$ping`\n' +
                    'To register your address, use the command: `$add <operator address> @<user1> @<user2>` (@<users> is optional)\n' +
                    'To unregister your address, use the command: `$delete <operator address>`\n' +
                    'To get the details of a poll, use the command: `$poll <poll id>`\n' +
                    'To get the stats of your address, use the command: `$stats <operator address>`\n';

                await message.reply(messageStr);
            } else if (message.content.startsWith('$ping')) {
                await message.reply('pong 🏓');
            } else if (message.content.startsWith('$add')) {
                const operatorAddress = message.content.split(' ')[1];
                let voterAddress = '';
                try {
                    voterAddress = await getVoterAddress(operatorAddress, channelNetwork);
                } catch (error) {
                    await message.reply(error.message);
                    return;
                }

                const userIds = message.mentions.users.map(m => m.id);
                if (userIds.length === 0) {
                    userIds.push(message.author.id);
                }

                const address = await getAddress({
                    voterAddress: voterAddress,
                    operatorAddress: operatorAddress,
                }, channelNetwork);

                if (address) {
                    console.log('address already registered');
                    await message.reply('Address already registered.');
                    return;
                }

                await saveAddress({
                    voterAddress: voterAddress,
                    operatorAddress: operatorAddress,
                    userIds: userIds.join(','),
                }, channelNetwork);

                const messageStr =
                    `Registration done for ${getMonikerByProxyAddress(voterAddress, channelNetwork)}!\n` +
                    `Voter Address: \`${voterAddress}\``;
                await message.reply(messageStr);
            } else if (message.content.startsWith('$delete')) {
                const operatorAddress = message.content.split(' ')[1];
                let voterAddress = '';
                try {
                    voterAddress = await getVoterAddress(operatorAddress, channelNetwork);
                } catch (error) {
                    await message.reply(error.message);
                    return;
                }

                const address = await getAddress({
                    voterAddress: voterAddress,
                    operatorAddress: operatorAddress,
                }, channelNetwork);

                if (!address) {
                    console.log('address not found');
                    await message.reply('This address not registered!');
                    return;
                }

                await deleteAddress(address.id);

                await message.reply('Your unregistration has been successful!');
            } else if (message.content.startsWith('$poll')) {
                const pollId = message.content.split(' ')[1];
                await sendPollDetailsMessage(message, pollId, channelNetwork);
            } else if (message.content.startsWith('$stats')) {
                const operatorAddress = message.content.split(' ')[1];

                let voterAddress = '';
                if (operatorAddress.startsWith('axelarvaloper')) {
                    try {
                        voterAddress = await getVoterAddress(operatorAddress, channelNetwork);
                    } catch (error) {
                        await message.reply(error.message);
                        return;
                    }
                } else if (operatorAddress.startsWith('axelar')) {
                    voterAddress = operatorAddress;
                }

                await sendVoterStatsMessage(message, voterAddress, channelNetwork);
            }
        }
    );

    await discord.login(discordBotToken);
}

async function sendPollDetailsMessage(message, pollId, network) {
    const poll = await getPoll(pollId, network);
    if (!poll) {
        await message.reply('Poll not found');
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('Axelarscan Link')
        .setURL(`https://${network === 'testnet' ? 'testnet.' : ''}axelarscan.io/evm-poll/${pollId}`)
        .setColor(0xFF0000)
        .setAuthor({name: 'Axelar Poll', iconURL: 'https://axelarscan.io/logos/logo_white.png'})
        .addFields(
            {name: 'Poll ID', value: poll.id.toString(), inline: true},
            {name: 'Height', value: poll.height.toString(), inline: true},
            {name: 'Chain', value: _.startCase(poll.chain)},
            {name: 'Tx Hash', value: poll.txHash.toString()},
            {name: 'Status', value: poll.success ? 'Success' : poll.failed ? 'Failed' : 'Pending'},
            {name: 'Total Votes', value: poll.totalVotes.toString()},
            {name: 'Yes Votes', value: poll.yesVotes.toString()},
            {name: 'No Votes', value: poll.noVotes.toString()},
        );


    const votesEmbed = [];
    for (const chunkElement of _.chunk(poll.votes, 20)) {
        const embedVotes = new EmbedBuilder()
            .setColor(0xFF0000)
            .addFields(
                {
                    name: 'Voter',
                    value: chunkElement.map(m => getMonikerByProxyAddress(m.voter, network)).join('\n'),
                    inline: true
                },
                {name: 'Vote', value: chunkElement.map(m => m.vote ? '✅' : '❌').join('\n'), inline: true},
            );
        votesEmbed.push(embedVotes);
    }

    await message.reply({content: '', embeds: [embed, ...votesEmbed]});
}

async function sendVoterStatsMessage(message, voterAddress, network) {
    const addressVotes = await getAddressVotes(voterAddress, network);
    if (!addressVotes || addressVotes.length === 0) {
        await message.reply('No votes found!');
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('Axelarscan Link')
        .setURL(`https://${network === 'testnet' ? 'testnet.' : ''}axelarscan.io/validator/${voterAddress}`)
        .setColor(0xFF0000)
        .setAuthor({name: 'Axelar Validator', iconURL: 'https://axelarscan.io/logos/logo_white.png'})
        .addFields(
            {name: 'Proxy Address', value: voterAddress.toString()},
            {name: 'Total Votes', value: addressVotes.length.toString()},
            {name: 'Yes Votes', value: addressVotes.filter(m => m.vote).length.toString()},
            {name: 'No Votes', value: addressVotes.filter(m => !m.vote).length.toString()},
        );


    const votesEmbed = [];
    for (const chunkElement of _.chunk(addressVotes, 20)) {
        const embedVotes = new EmbedBuilder()
            .setColor(0xFF0000)
            .addFields(
                {
                    name: 'Poll ID',
                    value: chunkElement.map(m => m.poll.pollId).join('\n'),
                    inline: true
                },
                {name: 'Vote', value: chunkElement.map(m => m.vote ? '✅' : '❌').join('\n'), inline: true},
                {
                    name: 'Poll Status',
                    value: chunkElement.map(m => m.poll.success ? 'Success' : m.poll.failed ? 'Failed' : 'Pending').join('\n'),
                    inline: true
                },
            );
        votesEmbed.push(embedVotes);
    }

    await message.reply({
        content: `Hey, ${getMonikerByProxyAddress(voterAddress, network)} here are your stats!`,
        embeds: [embed, ...votesEmbed]
    });
}