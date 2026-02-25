import mongoose from "mongoose"

const groupSchema = new mongoose.Schema({
    name: String,
    members: [String],
    createdAt: {
        type: Date,
        default: Date.now
    }
})

export default mongoose.model("Group", groupSchema)