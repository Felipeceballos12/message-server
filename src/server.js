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
    const conversationId = this.getConversationId(sender.username, recipient);

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

    io.emit('user connected', { newUser, users });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected ', socket.username);

    let currentUsers = users.filter((usr) => usr.id !== socket.id);
    users = currentUsers;

    socket.broadcast.emit('user disconnected', socket.username);
  });

  socket.on('user_typing', (data) => {
    socket.broadcast.emit('sender_typing', {
      chatType: data.chatInfo.type,
      chatActivedName: data.chatInfo.activedChat,
      sendername: data.sendername,
    });
  });

  socket.on('user_not_typing', (user) => {
    socket.broadcast.emit('sender_not_typing', user);
  });

  socket.on('usend_message', (data) => {
    console.log({ data });
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

    io.emit('get_message', {
      senderId: socket.id,
      content: data.content,
      sender: socket.username,
      activedChat: data.chatWith,
      chatType: data.chatType,
    });
  });

  socket.on('change_chat', (data) => {
    if (data.chat !== 'Group Messages') {
      let privateMessages = privateChat.getConversation(
        data.sender,
        data.recipient
      );

      if (privateMessages !== null) {
        io.emit('new_init_chat', {
          chatType: 'private',
          senderActivedID: data.senderActivedID,
          senderActived: data.sender,
          chat: privateMessages.messages,
        });
      }
    } else {
      io.emit('new_init_chat', {
        chatType: 'group',
        senderActivedID: data.senderID,
        senderActived: data.sender,
        chat: groupChat,
      });
    }
  });
});

const groupNameSpace = io.of('/privateGroup');
/* let privateGroupChat = {}; */

groupNameSpace.on('connection', (socket) => {
  socket.on('user connected', (data) => {
    socket.join(data.groupId);
    socket.username = data.userInfo.username;
    socket.groupID = data.groupId;

    if (!groupNameSpace.adapter.rooms.get(data.groupId).users) {
      groupNameSpace.adapter.rooms.get(data.groupId).users = {};
    }

    groupNameSpace.adapter.rooms.get(data.groupId).users[socket.id] =
      data.userInfo.username;

    socket.to(data.groupId).emit('new user', data.userInfo.username);
    groupNameSpace
      .to(data.groupId)
      .emit('get users', groupNameSpace.adapter.rooms.get(data.groupId).users);
  });

  socket.on('disconnect', () => {
    socket.to(socket.groupID).emit('user disconnect', socket.username);

    if (groupNameSpace.adapter.rooms.get(socket.groupID)) {
      delete groupNameSpace.adapter.rooms.get(socket.groupID).users[socket.id];

      socket
        .to(socket.groupID)
        .emit(
          'get users',
          groupNameSpace.adapter.rooms.get(socket.groupID).users
        );
    }
  });

  socket.on('listening messages', (data) => {
    groupNameSpace.to(socket.groupID).emit('listening messages', data);
  });

  socket.on('user typing', (user) => {
    socket.to(socket.groupID).emit('user typing', user);
  });

  socket.on('user not typing', (user) => {
    socket.to(socket.groupID).emit('user not typing', user);
  });
});

server.listen(3000, () => {
  console.log('Listening port', 3000);
});
