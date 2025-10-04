import { User } from "../models/user.model.js"
import { getAuth } from "@clerk/express";

const test = async (req, res) => {

    console.log("Request Headers-Cookie:", req.headers.cookie);
    console.log("Request Auth-debug:", req.auth().debug());
    console.log("Request Auth:", req.auth());

    res.send('User controller is working!');
};

const sync = async (req, res) => {
    
    try {
        const { userId } = getAuth(req);
        
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }
        let user = await User.findOne({ clerkId: userId });
        if (!user) {
            user = new User({ clerkId: userId });
            await user.save();
        }

        res.status(200).json({ message: "User synchronized successfully.", user });
    } catch (error) {
        console.error("Error synchronizing user:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export {
    test,
    sync,
};