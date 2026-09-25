import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { clerkMiddleware } from '@clerk/express'
import { isAllowedOrigin } from './config/origins.js'

const app = express()

app.use(cors({
    origin: function (origin, callback) {
        // Non-browser clients (curl, Postman, server-to-server) send no Origin.
        if (!origin || isAllowedOrigin(origin)) return callback(null, true);
        console.log('CORS blocked origin:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(cookieParser())
app.use(clerkMiddleware())
app.use(express.static("public"))

import googleRoutes from './routes/google.routes.js'
import userRoutes from './routes/user.routes.js'
import elixirRoutes from './routes/elixir.routes.js'
import trackRoutes from './routes/track.routes.js'
import aiRoutes from './routes/ai.routes.js'
import internalRoutes from './routes/internal.routes.js'

app.use('/api/v1/google', googleRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/elixirs', elixirRoutes)
app.use('/api/v1/tracks', trackRoutes)
app.use('/api/v1/ai', aiRoutes)
// Internal routes — used by Python AI agent (API key auth, no Clerk session)
app.use('/api/v1/internal', internalRoutes)

export default app
