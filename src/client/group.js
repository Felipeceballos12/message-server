const groupSocket = io('/privateGroup');
const usersActived = document.querySelector('.userStatus');

groupSocket.on('connect', () => {
  console.log('Socket is connected Yuppiii');
});

// Get Username
const username = prompt('¿What is your name?', '');

/* // Put username in the header chat
usersActived.innerHTML = users.join(', '); */
if (username !== null) {
  groupSocket.emit('user connected', {
    username,
    userId: crypto.randomUUID(),
  });
}
