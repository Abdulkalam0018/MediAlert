import { User } from "../models/user.model.js";
import { getAuth } from "@clerk/express";

const getUserFromClerk = async (req) => {

    const { userId: clerkUserId } = getAuth(req);

    if (!clerkUserId) {
        return null
    }

    const user = await User.findOne({ clerkId: clerkUserId });

    return user;
};

export { getUserFromClerk };