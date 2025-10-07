import 'dotenv/config'
import connectDB from "./db/index.js";
import app from './app.js'

connectDB()
.then(() => {
    const port = process.env.PORT || 8000
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    })

    app.on('error', (error) => {
        console.error('Server error:', error);
        process.exit(1);
    });

    // background jobs
    import('./jobs/track.job.js')
      .then(() => console.log("Starting track cron job..."))
      .catch(err => console.error("Failed to start track cron job:", err))
})
.catch((error) => {
    console.error("Connection error in DB", error);
})