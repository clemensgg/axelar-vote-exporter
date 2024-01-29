import express from 'express';
import { register as prometheusRegister } from 'prom-client';
import { setupValidators } from "./services/validators.js";
import { setupJobs } from "./jobs/index.js";
import { getMetricsPort } from "./config/env.js";

console.log('Starting...');

console.log('Setup validators...');
await setupValidators();

console.log('Setup jobs...');
await setupJobs();

const app = express();
const metricsPort = getMetricsPort();

app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', prometheusRegister.contentType);
        res.end(await prometheusRegister.metrics());
    } catch (error) {
        res.status(500).end(error);
    }
});

app.listen(metricsPort, () => {
    console.log(`Metrics server is running at http://localhost:${metricsPort}/metrics`);
});
