import prometheus from 'prom-client';

// Prometheus Gauges for each metric
export const maintainerStatusGauge = new prometheus.Gauge({
    name: 'axelarevm_maintainer_status',
    help: 'Chain maintainer status of each maintainer for each evm chain',
    labelNames: ['evm_chain', 'moniker', 'address'],
});

export const pollStatusGauge = new prometheus.Gauge({
    name: 'axlearevm_poll_status',
    help: 'Poll status: 1=pending, 2=confirmed, 4=failed',
    labelNames: ['poll_id', 'tx_hash'],
});

export const voteStatusGauge = new prometheus.Gauge({
    name: 'axlearevm_vote_status',
    help: 'Vote status for each poll and validator',
    labelNames: ['poll_id', 'tx_hash', 'moniker'],
});
