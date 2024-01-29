import {setupValidators} from "./services/validators.js";
import {setupJobs} from "./jobs/index.js";

console.log('Starting...');

console.log('Setup validators...');
await setupValidators();

console.log('Setup jobs...');
await setupJobs();