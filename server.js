const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

// 提供静态文件（前端页面）
app.use(express.static(path.join(__dirname)));

// 房间管理
const rooms = new Map();

// 生成随机房间ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 创建房间
  socket.on('createRoom', (playerName) => {
    const roomId = generateRoomId();
    const room = {
      id: roomId,
      players: [{
        id: socket.id,
        name: playerName || '玩家1',
        hp: 5,
        items: [],
        ready: false
      }],
      maxPlayers: 4,
      state: 'waiting', // waiting, playing, finished
      currentTurn: null
    };
    
    rooms.set(roomId, room);
    socket.join(roomId);
    
    console.log(`房间创建: ${roomId}`);
    socket.emit('roomCreated', roomId);
    io.to(roomId).emit('roomUpdated', room);
  });

  // 加入房间
  socket.on('joinRoom', (data) => {
    const { roomId, playerName } = data;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', '房间不存在！');
      return;
    }
    
    if (room.players.length >= room.maxPlayers) {
      socket.emit('error', '房间已满！');
      return;
    }
    
    room.players.push({
      id: socket.id,
      name: playerName || `玩家${room.players.length + 1}`,
      hp: 5,
      items: [],
      ready: false
    });
    
    socket.join(roomId);
    io.to(roomId).emit('roomUpdated', room);
    console.log(`玩家 ${socket.id} 加入房间 ${roomId}`);
  });

  // 开始游戏
  socket.on('startGame', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      room.state = 'playing';
      // 初始化游戏逻辑...
      io.to(roomId).emit('gameStarted', room);
    }
  });

  // 处理断开连接
  socket.on('disconnect', () => {
    console.log('用户断开:', socket.id);
    // 清理房间逻辑...
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});