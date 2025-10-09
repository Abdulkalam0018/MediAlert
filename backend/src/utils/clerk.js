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

const getUserId = async (req) => {
    try {
        let _id  = req.auth()?.sessionClaims?.mongoUserId;
        // console.log("_id from session claims:", _id);
        
        if(!_id) {
            // console.log("Fetching user from Clerk");
            
            const user = await getUserFromClerk(req);

            if (!user) {
                return null;
            }

            _id = user._id;
        }

        return _id;
    } catch (error) {
        console.error("Error getting user ID:", error);
        return null;
    }
};

export { getUserFromClerk, getUserId };