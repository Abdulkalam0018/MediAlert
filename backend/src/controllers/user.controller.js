import { User } from "../models/user.model.js"
import { getAuth, clerkClient } from "@clerk/express";

const test = async (req, res) => {

    console.log("Request Headers-Cookie:", req.headers.cookie);
    console.log("Request Auth-debug:", req.auth().debug());
    console.log("Request Auth:", req.auth());

    res.send('User controller is working!');
};

const sync = async (req, res) => {
    
    try {
        // console.log(req.auth());
        // sessionClaims: {
        //     azp: 'http://localhost:5173',
        //     clerkId: 'user_33YAciZIRgBdO46irMFXwmAiI1d',
        //     email: 'manjeet.20233179@mnnit.ac.in',
        //     exp: 1759726302,
        //     iat: 1759725702,
        //     iss: 'https://correct-jackal-16.clerk.accounts.dev',
        //     jti: 'c2599c47b14761daa098',
        //     name: 'Manjeet Kumar',
        //     nbf: 1759725642,
        //     sub: 'user_33YAciZIRgBdO46irMFXwmAiI1d',
        //     mongoUserId: '68e34639c9214736854d54c5'
        // },
        
        const { userId } = getAuth(req);
        
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }
        const userData = await clerkClient.users.getUser(userId);

        let user = await User.findOne({ clerkId: userId });
        if (!user) {
            user = new User({ 
                clerkId: userId,
                name: userData.firstName + " " + userData.lastName,
                email: userData.emailAddresses[0].emailAddress
            });
            user = await user.save();
            
            await clerkClient.users.updateUser(userId, {
            publicMetadata: {
                mongoDbId: user._id.toString(), 
            },
            });
        }
        else {
            user.name = userData.firstName + " " + userData.lastName;
            user.email = userData.emailAddresses[0].emailAddress;
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