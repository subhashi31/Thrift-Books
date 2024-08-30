// node server
// handles socket.io connection

const io = require('socket.io')(3200, {
    cors: { origin: '*' }
});

// Import the Mongoose library
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/userRegister', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Define the conversation schema
const conversationSchema = new mongoose.Schema({
    roomName: String,
    messages: [
        {
            sender: String,
            text: String,
            timestamp: Date
        }
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Create the Conversation model from the schema
const Conversation = mongoose.model('Conversation', conversationSchema);

const users = {};

// Generate a room name based on the combination of both usernames
function generateRoomName(name1, name2) {
    return [name1, name2].sort().join('-');
}

// Handle socket.io connections
io.on('connection', socket => {

    socket.on('join-room', async ({ yourName, chatWith }) => {
        const roomName = generateRoomName(yourName, chatWith);
        socket.join(roomName);

        users[socket.id] = { name: yourName, room: roomName };

        // Fetch the conversation history from the database
        const conversation = await Conversation.findOne({ roomName });
        if (conversation) {
            socket.emit('conversation-history', conversation.messages);
        }

        socket.to(roomName).emit('user-joined', yourName);
    });

    socket.on('send', message => {
        const user = users[socket.id];
        if (user) {
            const messageObj = {
                sender: user.name,
                text: message,
                timestamp: new Date()
            };
            socket.to(user.room).emit('receive', { message: message, name: user.name });

            // Store the message in the database
            Conversation.findOneAndUpdate(
                { roomName: user.room },
                {
                    $push: { messages: messageObj },
                    $set: { updatedAt: new Date() }
                },
                { upsert: true }
            ).exec();
        }
    });

    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            socket.to(user.room).emit('left', user.name);

            // Final update on the conversation (if needed)
            Conversation.findOneAndUpdate(
                { roomName: user.room },
                { $set: { updatedAt: new Date() } }
            ).exec();

            delete users[socket.id];
        }
    });
});
