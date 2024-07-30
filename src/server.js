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
const privateChat = {
  conversations: {},

  addMessage: function (sender, recipient, message) {
    const conversationId = this.getConversationId(
      sender.username,
      recipient
    );

    if (!this.conversations[conversationId]) {
      this.conversations[conversationId] = {
        participants: [sender.username, recipient],
        messages: [],
      };
    }

    this.conversations[conversationId].messages.push({
      senderId: sender.id,
      sender: sender.username,
      content: message,
      timestamp: new Date(),
    });
  },

  getConversationId: function (user1, user2) {
    return [user1, user2].sort().join('_');
  },

  getConversation: function (user1, user2) {
    const conversationId = this.getConversationId(user1, user2);
    return this.conversations[conversationId] || null;
  },

  getAllConversations: function (user) {
    return Object.values(this.conversations).filter((conv) =>
      conv.participants.includes(user)
    );
  },
};

app.use(express.static(join(_dirname, 'client')));
app.set('view engine', 'ejs');

app.get('/privateGroup/:groupName', (req, res) => {
  const groupId = crypto.randomUUID();
  const groupName = req.params.groupName;

  res.redirect(`/privateGroup/${groupName}/${groupId}`);
});

app.get('/privateGroup/:groupName/:groupId', (req, res) => {
  const groupId = req.params.groupId;
  const groupName = req.params.groupName;

  res.render(join(_dirname, 'views/group'), {
    groupId,
    groupName,
  });
});

io.on('connection', (socket) => {
  socket.on('user connected', (user) => {
    socket.username = user;

    users.push({
      username: user,
      id: socket.id,
    });

    let newUser = {
      username: user,
      id: socket.id,
    };

    console.log({ users });
    io.emit('user connected', { newUser, users });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected ', socket.username);

    let currentUsers = users.filter((usr) => usr.id !== socket.id);
    users = currentUsers;

    socket.broadcast.emit('user disconnected', socket.username);
  });

  socket.on('user typing', (user) => {
    socket.broadcast.emit('user typing', user);
  });

  socket.on('user not typing', (user) => {
    socket.broadcast.emit('user not typing', user);
  });

  socket.on('listening messages', (data) => {
    if (data.chatType === 'group') {
      groupChat.push({
        senderId: data.senderId,
        sender: data.sender,
        content: data.content,
      });
    } else {
      privateChat.addMessage(
        { username: data.sender, id: data.senderId },
        data.chatWith,
        data.content
      );
    }

    io.emit('listening messages', {
      senderId: socket.id,
      content: data.content,
      sender: socket.username,
      activedChat: data.chatWith,
    });
  });

  socket.on('get messages', (data) => {
    if (data.recipient !== 'Group Messages') {
      let privateMessages = privateChat.getConversation(
        data.sender,
        data.recipient
      );

      if (privateMessages !== null) {
        console.log('Messages: ', privateMessages);
        io.emit('get messages', privateMessages.messages);
      }
    } else {
      io.emit('get messages', groupChat);
    }
  });
});

const groupNameSpace = io.of('/privateGroup');
let privateGroupChat = {};

groupNameSpace.on('connection', (socket) => {
  console.log('Group Private');
  socket.on('user connected', (user) => {
    if (!privateGroupChat[socket.id]) {
      privateGroupChat[socket.id] = [user];
    } else {
      privateGroupChat[socket.id].push(user);
    }

    console.log(privateGroupChat);
  });
});

server.listen(3000, () => {
  console.log('Listening port', 3000);
});
