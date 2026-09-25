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
        timestamps: true,
        // Never send OAuth or push credentials to the browser. /users/me and
        // /users/sync used to return the Google refresh token in plain JSON.
        toJSON: {
            transform: (_doc, ret) => {
                delete ret.googleTokens;
                delete ret.fcmToken;
                return ret;
            },
        },
    }
)

export const User = mongoose.model("User", userSchema)