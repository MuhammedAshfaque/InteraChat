# InteraChat

A full-stack, real-time chat application similar to WhatsApp Web. This project supports secure user authentication, 1-on-1 private messaging, group chats, and multimedia (photo) sharing.

## Features

- **Real-Time Messaging**: Built with Socket.io for instant message delivery and robust bidirectional communication.
- **User Authentication**: Secure signup and login mechanisms using JSON Web Tokens (JWT) and Bcrypt for password hashing.
- **One-on-One Chat**: Private, real-time messaging between individual users.
- **Group Chat**: Seamless group creation and interaction among multiple participants.
- **Photo/Media Sharing**: Enables image uploads and media sharing within chat sessions using Multer.
- **Anti-Troll & Profanity Filter**: Actively monitors messages for abusive language. Users are issued warnings, and accumulating 3 warnings results in a 5-minute block from sending messages.
- **OTP Detection & Blocking**: Automatically detects and prevents the sending of 4 or 5-digit numerical codes (OTPs) to protect sensitive information from being accidentally shared.
- **Message Persistence**: All user profiles, active sessions, and chat histories are securely stored using MongoDB.
- **Modern User Interface**: A responsive and user-friendly frontend to emulate premium chat experiences.
 
## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose Object Document Mapper)
- **Real-time Engine**: Socket.io
- **Authentication & Security**: JSON Web Tokens (JWT), Bcrypt.js, CORS
- **File Uploads**: Multer
- **Environment Management**: dotenv
- **Development Tooling**: Nodemon

## Project Structure

```text
.
├── middleware/       # Express middlewares (e.g., JWT authentication, Multer upload config)
├── models/           # Mongoose schemas (e.g., User, Message, Group)
├── public/           # Frontend assets (HTML, vanilla CSS, client-side JS, images)
├── routes/           # Express API endpoints (Auth, Chat APIs, file sharing)
├── server.js         # Entry point, Express app & Socket.io initialization
└── package.json      # Dependencies and NPM scripts
```

## Prerequisites

Before setting up the project, ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (Download the LTS version)
- [MongoDB](https://www.mongodb.com/) (Local instance running, or an active MongoDB Atlas cluster URI)

## Installation & Setup

1. **Clone the repository / Navigate to the directory**:

2. **Install all dependencies**:
   Run the following command in the root folder to download the required Node.js packages:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (alongside `server.js`) and define the following crucial variables:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_random_jwt_key
   ```
   *(Ensure you replace the placeholders with your actual local or Atlas MongoDB URI and a secure, random string for your JWT secret)*

4. **Run the Application**:
   Start the application in development mode (which utilizes `nodemon` to automatically restart the server on file changes):
   ```bash
   npm run server
   ```
   *Alternatively, you can start the application normally using `node server.js`.*

5. **Access the Chat App**:
   Once the server is running and the database is connected successfully, open your web browser and navigate to:
   [http://localhost:3000](http://localhost:3000) (or the port you defined in your `.env` file).

## Future Enhancements
* Read receipts and online/offline status indicators.
* End-to-end message encryption.
* Push notifications.

## License
[ISC](https://choosealicense.com/licenses/isc/)
