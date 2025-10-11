import mongoose, {Schema} from "mongoose"

const userSchema = new Schema(
    {
        clerkId: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        allowCalendarSync: {
            type: Boolean,
            default: false,
        },
        googleTokens: {
            access_token: String,
            refresh_token: String,
            expires_date: Date,
            last_refresh_at: Date,
        },
        lastCalendarSync: {
            type: Date,
        },
        fcmToken: {
            type: String,
        }
    },
    {
        timestamps: true
    }
)

export const User = mongoose.model("User", userSchema)