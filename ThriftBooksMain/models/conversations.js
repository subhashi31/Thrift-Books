// Import the Mongoose library
const mongoose = require('mongoose');

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
module.exports = Conversation;