const socket = io();
const form = document.querySelector('#form');
const messagesInput = document.querySelector('#input');
const messages = document.querySelector('#messages');
const chats = document.querySelector('.chatsContainer');
const userProfileMessage = document.querySelector(
  '.userProfileMessage'
);
const userNameMessage = document.querySelector('.userNameMessage');

const usersTalkingPrivalety = {};

// Socket Connection
socket.on('connect', () => {
  console.log('Socket is connected to client: id ->', socket.id);
});

// Get Username
socket.username = prompt('¿What is your name?', '');

// Send username to the server
socket.emit('user connected', socket.username);
// Listening when the user is typing to send to the server
messagesInput.addEventListener('input', (e) => {
  socket.emit('user typing', socket.username);
});

// Listening when user stop typing to send to the server
messagesInput.addEventListener('change', () => {
  socket.emit('user not typing', socket.username);
});

// Get when the user is typing from the server
socket.on('user typing', (user) => {
  const typing = document.querySelector('.typing');
  typing.classList = 'typing typing-active';
  typing.style.display = 'block';
  typing.innerText = `${user} is typing ....`;
});

// Get whe the user isn't typing from the server
socket.on('user not typing', (user) => {
  const typing = document.querySelector('.typing');
  typing.classList = 'typing typing-not-active';
  typing.style.display = 'none';
  typing.innerText = '';
});

// Get new messages from the server
socket.on('group messages', (data) => {
  console.log({ data });
  receiveMessage(
    messages,
    { username: data.username, id: data.id },
    data.message
  );
});

let isGroupCreated = false;

// Get users when we had a new connection
socket.on('user connected', (users) => {
  users.forEach((user) => {
    if (users.length >= 1) {
      const usersContected = document.querySelectorAll(
        '.userConnectedContainer'
      );
      console.log({ usersContected });
    }

    if (!isGroupCreated) {
      if (users.length > 0) {
        createChatButton('Group Messages');
        isGroupCreated = true;
      }
    }

    createChatButton(user.username);
  });
});

function createChatButton(name) {
  const container = createElementWithClass(
    'button',
    'userConnectedContainer'
  );
  const userId = createElementWithClass('p', 'userConnected');
  const status = createElementWithClass('p', 'userConnectedStatus');

  userId.append(name);
  status.append('Online');

  container.onclick = () => {
    //createPrivateChat(user);
    console.log({ name });
  };

  container.appendChild(userId);
  container.appendChild(status);
  chats.appendChild(container);
}

// Get the user disconnected
socket.on('user disconnected', (user) => {
  const userContainer = document.querySelectorAll(
    '.userConnectedContainer'
  );

  userContainer.forEach((ele) => {
    console.log({ child: ele.childNodes });
    if (ele.childNodes[0].innerText === user) {
      alert(`${user} had been desconnected`);
      ele.remove();
    }
  });
});

// Send the message to the server
form.addEventListener('submit', (e) => {
  e.preventDefault();

  if (messagesInput.value) {
    socket.emit('group message', {
      chatType: 'group',
      username: socket.username,
      message: messagesInput.value,
    });
    messagesInput.value = '';
  }
});

// Others
function receiveMessage(msgContainer, user, msg) {
  const item = createElementWithClass('li', 'messageInContainer');
  const userProfile = createElementWithClass('p', 'messageInProfile');
  const message = createElementWithClass('p', 'messageIn');

  userProfile.textContent = user.username[0].toUpperCase();
  message.textContent = msg;

  console.log('User from message: ', user);
  if (socket.id === user.id) {
    item.style.justifyContent = 'flex-end';
    userProfile.style.order = 2;
  }

  item.appendChild(userProfile);
  item.appendChild(message);

  msgContainer.appendChild(item);
}

function createElementWithClass(element, className = '') {
  if (!element) {
    throw Error('Not element assigned');
  }

  const ele = document.createElement(element);
  ele.className = className;

  return ele;
}

function createPrivateChat(user) {
  const userNameMessage = document.querySelector('.userNameMessage');
  const userProfileMessage = document.querySelector(
    '.userProfileMessage'
  );

  if (!usersTalkingPrivalety[user.id]) {
    usersTalkingPrivalety[user.id] = user.username;
  }
}
