// room

const socket = io('http://localhost:3200');

const form = document.getElementById('send-container');
const messageInput = document.getElementById('messageInp');
const messageContainer = document.querySelector(".container");

var audio = new Audio('popupsound.mp3');

window.onload = function() {
    var container = document.getElementById('scrollable-container');
    container.scrollTop = container.scrollHeight;
};


// Append function will append event to the container
const append = (message, position)=>{
    const messageElement = document.createElement('div');
    messageElement.innerHTML = message;
    messageElement.classList.add('message');
    messageElement.classList.add(position);
    messageContainer.append(messageElement);

    if(position == 'left')
    { audio.play(); }
}

form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const message = messageInput.value;
    append(`You: ${message}`, 'right');
    socket.emit('send', message);
    messageInput.value = '';
});


// const yourName = prompt("Enter your name");
// const chatWith = prompt("Enter the name of the person you want to chat with");

// Function to get URL parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Get 'yourName' and 'chatWith' from URL parameters
const yourName = getQueryParam('yourName');
const chatWith = getQueryParam('chatWith');


// Emit event to join a specific room based on the combination of both names
socket.emit('join-room', { yourName, chatWith });

socket.on('user-joined', name => {
    append(`${name} joined the chat`, 'left')
});

socket.on('receive', data => {
    append(`${data.name}: ${data.message}`, 'left')
});

socket.on('left', name => {
    append(`${name} left the chat`, 'left')
});

// Listen for conversation history and display it
socket.on('conversation-history', messages => {
    messages.forEach(message => {
        const position = message.sender === yourName ? 'right' : 'left';
        if(message.sender == yourName)
            append(`You: ${message.text}`, position);
        else 
            append(`${message.sender}: ${message.text}`, position);
    });
});
