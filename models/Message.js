import mongoose from "mongoose"

const messageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    text: String,
    imageUrl: String, // ⭐ NEW
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

export default mongoose.model("Message", messageSchema)