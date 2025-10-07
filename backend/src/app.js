import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { clerkMiddleware } from '@clerk/express'

const app = express()

const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:5173'];

app.use(cors({
    origin: function (origin, callback) {
        // testing with tools like Postman 
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(cookieParser())
app.use(clerkMiddleware())
app.use(express.static("public"))

import userRoutes from './routes/user.routes.js'
import elixirRoutes from './routes/elixir.routes.js'

app.use('/api/v1/users', userRoutes)
app.use('/api/v1/elixirs', elixirRoutes)

export default app