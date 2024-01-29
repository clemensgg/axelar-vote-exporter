import checkPollsJob from "./check-polls-job.js";
import setValidatorsJob from "./set-validators-job.js";

// setup all jobs
export function setupJobs() {
    checkPollsJob();
    setValidatorsJob();
}