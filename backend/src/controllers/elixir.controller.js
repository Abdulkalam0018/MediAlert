import { Elixir } from "../models/elixir.model.js";
import { getUserFromClerk } from "../utils/clerk.js"

const addElixir = async (req, res) => {
    try {
        const { name, dosage, notes } = req.body;

        let _id  = req.auth()?.sessionClaims?.mongoUserId;
        
        if(!_id) {
            const user = await getUserFromClerk(req)

            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            _id = user._id
        }

        const newElixir = new Elixir({
            userId: _id,
            name,
            dosage,
            notes
        });

        await newElixir.save();
        res.status(201).json({ message: "Elixir added successfully", elixir: newElixir });
    } catch (error) {
        console.error("Error adding elixir:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const getElixirs = async (req, res) => {
    try {
        let _id = req.auth()?.sessionClaims?.mongoUserId;

        if(!_id) {
            const user = await getUserFromClerk(req)

            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }
            console.log(user);
            
            _id = user._id
        }

        const elixirs = await Elixir.find({ userId: _id });
        res.status(200).json(elixirs);
    } catch (error) {
        console.error("Error fetching elixirs:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const updateElixir = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, dosage, notes } = req.body;
        let user_id  = req.auth()?.sessionClaims?.mongoUserId;

        if(!user_id) {
            const user = await getUserFromClerk(req)

            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            user_id = user._id
        }

        const elixir = await Elixir.findOne({ _id: id, userId: user_id });
        if (!elixir) {
            return res.status(404).json({ message: "Elixir not found." });
        }

        elixir.name = name || elixir.name;
        elixir.dosage = dosage || elixir.dosage;
        elixir.notes = notes || elixir.notes;
        await elixir.save();

        res.status(200).json({ message: "Elixir updated successfully", elixir });
    } catch (error) {
        console.error("Error updating elixir:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

const deleteElixir = async (req, res) => {
    try {
        const { id } = req.params;
        let user_id  = req.auth()?.sessionClaims?.mongoUserId;

        if(!user_id) {
            const user = await getUserFromClerk(req)

            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            user_id = user._id
        }

        const elixir = await Elixir.findOneAndDelete({ _id: id, userId: user_id });
        if (!elixir) {
            return res.status(404).json({ message: "Elixir not found." });
        }

        res.status(200).json({ message: "Elixir deleted successfully" });
    } catch (error) {
        console.error("Error deleting elixir:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export {
    addElixir,
    getElixirs,
    updateElixir,
    deleteElixir,
};