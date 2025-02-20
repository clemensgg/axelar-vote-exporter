import prometheus from 'prom-client';

// Prometheus Gauges for each metric
export const maintainerStatusGauge = new prometheus.Gauge({
    name: 'axelarevm_maintainer_status',
    help: 'Chain maintainer status of each maintainer for each evm chain',
    labelNames: ['evm_chain', 'moniker', 'address'],
});

export const pollStatusGauge = new prometheus.Gauge({
    name: 'axlearevm_poll_status',
    help: 'Poll status: 0=pending, 1=confirmed, 2=failed',
    labelNames: ['evm_chain', 'poll_id', 'tx_hash'],
});

export const voteStatusGauge = new prometheus.Gauge({
    name: 'axlearevm_vote_status',
    help: 'Vote status for each poll and validator: 0=pending, 1=yes, 2=no',
    labelNames: ['evm_chain', 'poll_id', 'tx_hash', 'moniker', 'address'],
});
