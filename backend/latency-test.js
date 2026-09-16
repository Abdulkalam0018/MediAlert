const http = require('http');

const URL = 'http://localhost:8000/api/v1/users/test';
const REQUESTS = 100;

async function runLatencyTest() {
  console.log(`Starting latency test for ${URL}...`);
  console.log(`Sending ${REQUESTS} requests...\n`);

  let totalTime = 0;
  let minTime = Infinity;
  let maxTime = 0;
  const startTestTime = Date.now();
  let successfulRequests = 0;

  for (let i = 0; i < REQUESTS; i++) {
    const start = Date.now();
    try {
      const response = await fetch(URL);
      await response.text();
      
      const duration = Date.now() - start;
      totalTime += duration;
      minTime = Math.min(minTime, duration);
      maxTime = Math.max(maxTime, duration);
      
      if (response.ok) {
        successfulRequests++;
      }
    } catch (error) {
      console.error(`Request ${i + 1} failed:`, error.message);
    }
  }

  const totalTestDuration = Date.now() - startTestTime;
  const avgTime = totalTime / REQUESTS;

  console.log('--- Latency Test Results ---');
  console.log(`Total Requests:    ${REQUESTS}`);
  console.log(`Successful:        ${successfulRequests}`);
  console.log(`Average Latency:   ${avgTime.toFixed(2)} ms`);
  console.log(`Min Latency:       ${minTime} ms`);
  console.log(`Max Latency:       ${maxTime} ms`);
  console.log(`Total Time Taken:  ${totalTestDuration} ms`);
  console.log(`Throughput:        ${(REQUESTS / (totalTestDuration / 1000)).toFixed(2)} req/sec`);
}

runLatencyTest();

