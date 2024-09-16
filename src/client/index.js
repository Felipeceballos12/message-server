const socket = io();
const form = document.querySelector('#form');
const messagesInput = document.querySelector('#input');
const messages = document.querySelector('#messages');
const chats = document.querySelector('.chatsContainer');
const userProfileMessage = document.querySelector('.userProfileMessage');
const userNameMessage = document.querySelector('.userNameMessage');
const createGroupButton = document.querySelector('.createGroupButton');

const usersTalkingPrivalety = {};

// Socket Connection
socket.on('connect', () => {
  console.log('Socket is connected to client: id ->', socket.id);
});

// Get Username
socket.username = prompt('¿What is your name?', '');

if (socket.username !== null) {
  // Send username to the server
  socket.emit('user connected', socket.username);
}

// Listening when the user is clicked on the create group
createGroupButton.addEventListener('click', () => {
  const groupName = prompt('What is the name of the group');

  if (groupName !== null) {
    // new namespace
    const url = `/privateGroup/${groupName}`;
    window.open(url, '_blank');
  }
});

// Listening when the user is typing to send to the server
messagesInput.addEventListener('input', () => {
  const chatType =
    userNameMessage.innerHTML !== 'Group Messages' ? 'private' : 'group';
  const activedChat =
    userNameMessage.innerHTML !== 'Group Messages'
      ? userNameMessage.innerHTML
      : 'Group Messages';

  socket.emit('user_typing', {
    chatInfo: {
      type: chatType,
      activedChat,
    },
    sendername: socket.username,
  });
});

// Listening when user stop typing to send to the server
messagesInput.addEventListener('change', () => {
  socket.emit('user_not_typing', socket.username);
});

// Get when the user is typing from the server
socket.on('sender_typing', (data) => {
  const typing = document.querySelector('.typing');

  if (userNameMessage.innerHTML === 'Group Messages') {
    if (data.chatType === 'group') {
      typing.classList = 'typing typing-active';
      typing.style.display = 'block';
      typing.innerText = `${data.sendername} is typing ....`;
    }
    return;
  }

  if (data.chatType === 'group') return;

  if (
    data.chatActivedName === socket.username &&
    data.sendername === userNameMessage.innerHTML
  ) {
    typing.classList = 'typing typing-active';
    typing.style.display = 'block';
    typing.innerText = `${data.sendername} is typing ....`;
  }
});

// Get whe the user isn't typing from the server
socket.on('sender_not_typing', (user) => {
  const typing = document.querySelector('.typing');
  typing.classList = 'typing typing-not-active';
  typing.style.display = 'none';
  typing.innerText = '';
});

// Get new messages from the server
socket.on('get_message', (data) => {
  if (userNameMessage.innerHTML === 'Group Messages') {
    if (data.chatType === 'group') {
      receiveMessage(
        messages,
        { username: data.sender, id: data.senderId },
        data.content
      );
    }
    return;
  }

  if (data.chatType === 'group') return;

  const isCurrentUserSender = socket.username === data.sender;
  const isCurrentUserReceiver = socket.username === data.activedChat;
  const isSenderActive = userNameMessage.innerHTML === data.sender;
  const isActiveChatOpen = userNameMessage.innerHTML === data.activedChat;

  if (
    (isCurrentUserSender && isActiveChatOpen) ||
    (isCurrentUserReceiver && isSenderActive)
  ) {
    receiveMessage(
      messages,
      { username: data.sender, id: data.senderId },
      data.content
    );
  }
});

// Get messages of the current chat from the server
socket.on(
  'new_init_chat',
  ({ chatType, senderActivedID, senderActived, chat }) => {
    if (messages.childNodes.length <= 0) {
      chat?.forEach((data) => {
        receiveMessage(
          messages,
          { username: data.sender, id: data.senderId },
          data.content
        );
      });
    }
  }
);

let isGroupCreated = false;
let chatMode = 'group'; // 'group' or 'private'

// Get users when we had a new connection
socket.on('user connected', ({ newUser, users }) => {
  /* const userConnected = document.querySelectorAll('.userConnected'); */
  const userConnected = Array.from(
    document.querySelectorAll('.userConnected')
  ).map((element) => element.innerText);

  if (!isGroupCreated && users.length > 0) {
    createChatButton('Group Messages', null);
    isGroupCreated = true;
  }

  // Filtrar usuarios que aún no han sido desplegados
  const newUsers = users.filter((user) => {
    return (
      user.username !== socket.username &&
      !userConnected.includes(user.username)
    );
  });

  newUsers.forEach((user) => {
    createChatButton(user.username, user.id);
  });
});

// Get the user disconnected
socket.on('user disconnected', (user) => {
  const userContainer = document.querySelectorAll('.userConnectedContainer');

  userContainer.forEach((ele) => {
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
    if (userNameMessage.innerHTML === 'Group Messages') {
      socket.emit('usend_message', {
        chatType: 'group',
        senderId: socket.id,
        sender: socket.username,
        content: messagesInput.value,
        chatWith: 'Group Messages',
      });
    } else {
      socket.emit('usend_message', {
        chatType: 'private',
        senderId: socket.id,
        sender: socket.username,
        content: messagesInput.value,
        chatWith: userNameMessage.innerHTML,
      });
    }
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

function createChatButton(name, id) {
  const container = createElementWithClass('button', 'userConnectedContainer');
  const userId = createElementWithClass('p', 'userConnected');
  const status = createElementWithClass('p', 'userConnectedStatus');

  userId.append(name);
  status.append('Online');

  container.onclick = () => {
    if (userNameMessage.innerHTML !== name) {
      openChat({ username: name, id: id });
    }
  };

  container.appendChild(userId);
  container.appendChild(status);
  chats.appendChild(container);
}

function openChat(recipient) {
  if (messages.childNodes.length > 0) {
    while (messages.firstChild) {
      messages.removeChild(messages.firstChild);
    }
  }

  if (!usersTalkingPrivalety[recipient.id]) {
    usersTalkingPrivalety[recipient.id] = recipient.username;
  }

  userNameMessage.innerHTML = recipient.username;

  socket.emit('change_chat', {
    senderID: socket.id,
    sender: socket.username,
    chat: recipient.username,
  });
}

/* 
Each item in the sidebar will have an onClick function
- 1st item in the side bar = group messages. onClick will be a function like renderGroupMessages()
- private messages will be renderPrivateChat('user') which will get messages from server. maybe a loading message in between.


*/
