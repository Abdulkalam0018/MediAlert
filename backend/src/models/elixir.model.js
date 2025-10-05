import mongoose, {Schema} from "mongoose"

const elixirSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        dosage: {
            type: String,
        },
        notes: {
            type: String,
        },
    },
    {
        timestamps: true
    }
)

export const Elixir = mongoose.model("Elixir", elixirSchema)