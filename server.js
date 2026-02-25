import express from 'express'
import dotenv from "dotenv"
dotenv.config()
import Group from "./models/Group.js"
import User from "./models/User.js"
import Message from "./models/Message.js"
import path from 'path'
import multer from "multer"
import http from 'http'
import { Server } from 'socket.io'
import connectDB from "./config/db.js"

connectDB()

const app = express()
app.use(express.json())
const server = http.createServer(app)
const io = new Server(server)


const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname)
    }
})
function containsAbuse(text) {

    if (!text) return false

    const badWords = [
        "idiot",
        "stupid",
        "dumb",
        "badword"
    ]

    const lowerText = text.toLowerCase()

    return badWords.some(word => lowerText.includes(word))
}
const upload = multer({ storage })
// Handle socket connections
io.on("connection", (socket) => {

    console.log("User connected:", socket.id)

    // USER JOINED
    socket.on("user-joined", async (username) => {
        try {
            let user = await User.findOne({ username })

            if (!user) {
                user = await User.create({
                    username,
                    socketId: socket.id
                })
            } else {
                user.socketId = socket.id
                await user.save()
            }

            // Send updated users list to all clients
            const users = await User.find({})
            io.emit("users-updated", users)

            console.log("User saved:", user.username)

        } catch (err) {
            console.error(err)
        }
    })

    // PRIVATE MESSAGE
    socket.on("private-message", async ({ to, message, imageUrl, username }) => {

        try {
            if (containsAbuse(message)) {
                console.log("Blocked abusive message")
                return
            }

            const receiverUser = await User.findOne({ socketId: to })
            if (!receiverUser) return

            const savedMessage = await Message.create({
                sender: username,
                receiver: receiverUser.username,
                text: message,
                imageUrl
            })

            io.to(to).emit("private-message", {
                message,
                imageUrl,
                username
            })

        } catch (err) {
            console.error(err)
        }
    })
    socket.on("join-group", async ({ groupId, username }) => {

        try {

            const group = await Group.findById(groupId)

            if (!group) return

            // ⭐ allow only members
            if (!group.members.includes(username)) {
                console.log("User not allowed in group")
                return
            }

            socket.join(groupId)

            console.log(`${username} joined group ${group.name}`)

        } catch (err) {
            console.error(err)
        }
    })
    socket.on("group-message", async ({ groupId, message, username }) => {

        try {
            if (containsAbuse(message)) {
                console.log("Blocked abusive group message")
                return
            }
            const group = await Group.findById(groupId)
            if (!group) return

            // ⭐ verify sender is member
            if (!group.members.includes(username)) {
                console.log("Unauthorized group message")
                return
            }

            await Message.create({
                sender: username,
                text: message,
                groupId
            })

            io.to(groupId).emit("group-message", {
                message,
                username,
                groupId
            })

        } catch (err) {
            console.error(err)
        }
    })
    // DISCONNECT
    socket.on("disconnect", async () => {
        try {
            await User.findOneAndUpdate(
                { socketId: socket.id },
                { socketId: null }
            )

            const users = await User.find({})
            io.emit("users-updated", users)

            console.log("User disconnected:", socket.id)
        } catch (err) {
            console.error(err)
        }
    })

})

// Serve static files
app.use(express.static(path.resolve('./public')))
app.use("/uploads", express.static("uploads"))
app.post("/upload", upload.single("image"), (req, res) => {
    res.json({
        imageUrl: `/uploads/${req.file.filename}`
    })
})
// GET USERS
app.get("/users", async (req, res) => {
    const users = await User.find({})
    res.json(users)
})
app.get("/messages/:user1/:user2", async (req, res) => {
    const { user1, user2 } = req.params

    try {
        const messages = await Message.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ]
        }).sort({ createdAt: 1 })

        res.json(messages)

    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Failed to fetch messages" })
    }
})
app.post("/create-group", async (req, res) => {

    const { name, members } = req.body

    const group = await Group.create({
        name,
        members
    })

    // ⭐ notify all clients
    const groups = await Group.find({})
    io.emit("groups-updated", groups)

    res.json(group)
})
app.get("/groups", async (req, res) => {
    const groups = await Group.find({})
    res.json(groups)
})
app.get("/group-messages/:groupId", async (req, res) => {

    const messages = await Message.find({
        groupId: req.params.groupId
    }).sort({ createdAt: 1 })

    res.json(messages)
})

// Send index file
app.get('/', (req, res) => {
    res.sendFile(path.resolve('./public/index.html'))
})

server.listen(3000, () => {
    console.log(`Server running on http://localhost:3000`)
})