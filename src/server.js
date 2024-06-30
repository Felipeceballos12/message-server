import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const app = express();
const server = createServer(app);
const io = new Server(server);

const _dirname = dirname(fileURLToPath(import.meta.url));

/*
app.use('/', (req, res) => {
  res.sendFile(join(_dirname, 'client/index.html'));
}); */
let users = [];
let groupChat = [];
let privateChat = [];

app.use(express.static(join(_dirname, 'client')));

io.on('connection', (socket) => {
  socket.on('user connected', (user) => {
    users.push({
      username: user,
      id: socket.id,
    });

    console.log({ users });
    socket.username = user;
    io.emit('user connected', users);
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit('user disconnected', socket.username);
    let currentUsers = users.filter(
      (usr) => usr.user !== socket.username
    );

    users = currentUsers;
    console.log('user disconnected');
  });

  socket.on('user typing', (user) => {
    socket.broadcast.emit('user typing', user);
  });

  socket.on('user not typing', (user) => {
    socket.broadcast.emit('user not typing', user);
  });

  socket.on('group message', (data) => {
    if (data.chatType === 'group') {
      groupChat.push({
        username: data.username,
        messsage: data.message,
      });
    } else {
      privateChat.push({
        username: data.username,
        messsage: data.message,
      });
    }

    io.emit('group messages', {
      id: socket.id,
      message: data.message,
      username: socket.username,
    });
  });
});

server.listen(3000, () => {
  console.log('Listening port', 3000);
});
