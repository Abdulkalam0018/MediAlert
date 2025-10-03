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
})
.catch((error) => {
    console.error("Connection error in DB", error);
})