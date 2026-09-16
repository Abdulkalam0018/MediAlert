import 'dotenv/config'
import connectDB from "./db/index.js";
import app from './app.js'
import http from 'http';
import { initSocket } from './socket.js';
import { initRedis } from './config/redis.js';
import { initRabbitMQ } from './config/rabbitmq.js';

const server = http.createServer(app);
initSocket(server);

connectDB()
.then(async () => {
    // Initialize Redis & RabbitMQ before starting server
    await initRedis();
    await initRabbitMQ();

    const port = process.env.PORT || 8000
    server.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    })

    server.on('error', (error) => {
        console.error('Server error:', error);
        process.exit(1);
    });

    // background jobs
    import('./jobs/track.job.js')
      .catch(err => console.error("❌ Failed to start track cron job:", err))
    
    import('./jobs/calendar.job.js')
      .catch(err => console.error("❌ Failed to start calendar cron job:", err))

    import('./jobs/alert.job.js')
      .catch(err => console.error("❌ Failed to start alert cron job:", err))
})
.catch((error) => {
    console.error("Connection error in DB", error);
})