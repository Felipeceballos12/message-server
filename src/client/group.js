const groupSocket = io('/privateGroup');
const usersActived = document.querySelector('.userStatus');
const form = document.querySelector('#form');
const messagesInput = document.querySelector('#input');
const messages = document.querySelector('#messages');
const leaveGroupButton = document.querySelector('.leaveGroup');

groupSocket.on('connect', () => {
  console.log('Socket is connected Yuppiii');
});

// Get Username
groupSocket.username = prompt('¿What is your name?', '');

/* // Put username in the header chat
usersActived.innerHTML = users.join(', '); */
if (groupSocket.username !== null) {
  const [groupName, groupId] = getParams(window.location.href);

  groupSocket.emit('user connected', {
    userInfo: {
      userId: crypto.randomUUID(),
      username: groupSocket.username,
    },
    groupId,
    groupName,
  });
}

// Get users connected
groupSocket.on('get users', (users) => {
  usersActived.innerHTML = Object.values(users).join(', ');
});

// Get user disconnected
groupSocket.on('user disconnect', (user) => {
  alert(`${user} left the chat`);
});

// Alert new user
groupSocket.on('new user', (user) => {
  alert(`${user} has join us`);
});

// Leave Group
leaveGroupButton.addEventListener('click', () => {
  let answer = prompt('Do you want to leave the group: (yes / no)');

  if (answer !== null) {
    let lowerCaseAnswer = answer.toLocaleLowerCase();
    console.log(lowerCaseAnswer);
    while (lowerCaseAnswer !== 'yes' && lowerCaseAnswer !== 'no') {
      alert('Wrong answer, try again');
      answer = prompt('Do you want to leave the group: (yes / no)');
    }

    if (lowerCaseAnswer === 'yes') {
      groupSocket.disconnect();
      window.close();
    }
  }
});

// Listening when the user is typing to send to the server
messagesInput.addEventListener('input', () => {
  groupSocket.emit('user typing', groupSocket.username);
});

// Listening when user stop typing to send to the server
messagesInput.addEventListener('change', () => {
  groupSocket.emit('user not typing', groupSocket.username);
});

// Get when the user is typing from the server
groupSocket.on('user typing', (user) => {
  const typing = document.querySelector('.typing');
  typing.classList = 'typing typing-active';
  typing.style.display = 'block';
  typing.innerText = `${user} is typing ....`;
});

// Get whe the user isn't typing from the server
groupSocket.on('user not typing', (user) => {
  const typing = document.querySelector('.typing');
  typing.classList = 'typing typing-not-active';
  typing.style.display = 'none';
  typing.innerText = '';
});

// Listening for the messages
groupSocket.on('listening messages', (data) => {
  receiveMessage(
    messages,
    { sender: data.sender, senderId: data.senderId },
    data.content
  );
});

// Send the message to the server
form.addEventListener('submit', (e) => {
  e.preventDefault();

  if (messagesInput.value) {
    groupSocket.emit('listening messages', {
      senderId: groupSocket.id,
      sender: groupSocket.username,
      content: messagesInput.value,
    });

    messagesInput.value = '';
  }
});

// Others
function getParams(url) {
  const regex = /\/privateGroup\/([^\/]+)\/([^\/]+)/;
  const match = url.match(regex);

  const [, groupName, groupId] = match;
  return [groupName, groupId];
}

// Others
function receiveMessage(msgContainer, user, msg) {
  const item = createElementWithClass('li', 'messageInContainer');
  const userProfile = createElementWithClass('p', 'messageInProfile');
  const message = createElementWithClass('p', 'messageIn');

  userProfile.textContent = user.sender[0].toUpperCase();
  message.textContent = msg;

  if (groupSocket.id === user.senderId) {
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
