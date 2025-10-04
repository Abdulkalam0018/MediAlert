import mongoose, {Schema} from "mongoose"

const userSchema = new Schema(
    {
        clerkId: {
            type: String,
            required: true,
            unique: true,
        },
    },
    {
        timestamps: true
    }
)

export const User = mongoose.model("User", userSchema)