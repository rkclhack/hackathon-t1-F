// ルーム管理用のマップ
const roomUsers = new Map() // roomId -> Set(userIds)
const userRooms = new Map() // userId -> roomId

export default (io, socket) => {
  console.log('ユーザーが接続しました:', socket.id)

  // 入室メッセージをクライアントに送信する
  socket.on("enterEvent", (data) => {
    console.log(`${data}さんが入室しました。`)
    socket.broadcast.emit("enterEvent", data)
  })

  // 退室メッセージをクライアントに送信する
  socket.on("exitEvent", (data) => {
    console.log(`${data.userName}さんが退室しました。`)

    // ユーザーが所属していたルームから退出
    const currentRoom = userRooms.get(socket.id)
    if (currentRoom) {
      leaveRoom(socket, currentRoom, data.userName)
    }

    socket.broadcast.emit("exitEvent", data)
  })

  // 投稿メッセージを送信する
  socket.on("publishEvent", (data) => {
    console.log(`${data.userName}: ${data.content}`)

    // 現在のルームにのみメッセージを送信
    const currentRoom = userRooms.get(socket.id)
    if (currentRoom) {
      // ルーム内の全員にメッセージを送信
      socket.to(currentRoom).emit('publishEvent', {
        ...data,
        roomId: currentRoom,
        timestamp: new Date().toISOString()
      })

      // 送信者にも確認メッセージを送信
      socket.emit('publishEvent', {
        ...data,
        roomId: currentRoom,
        timestamp: new Date().toISOString()
      })
    }
  })

  // 新規: ルーム参加イベント
  socket.on('joinRoom', (data) => {
    const { roomId, userName } = data

    // 前のルームから退出
    const previousRoom = userRooms.get(socket.id)
    if (previousRoom && previousRoom !== roomId) {
      leaveRoom(socket, previousRoom, userName)
    }

    // 新しいルームに参加
    joinRoom(socket, roomId, userName)
  })

  // 新規: ルーム退出イベント
  socket.on('leaveRoom', (data) => {
    const { roomId, userName } = data
    leaveRoom(socket, roomId, userName)
  })

  // 新規: 戦略更新イベント
  socket.on('strategyUpdate', (data) => {
    const { roomId, strategy, timestamp } = data
    console.log(`戦略が更新されました - ルーム: ${roomId}`)

    // 現在のルーム内の他のユーザーに戦略更新を通知
    socket.to(roomId).emit('strategyUpdate', {
      roomId,
      strategy,
      timestamp
    })
  })

  // 新規: メッセージ削除イベント
  socket.on('deleteMessage', (data) => {
    const { roomId, messageId } = data
    console.log(`メッセージ削除要求 - ルーム: ${roomId}, メッセージID: ${messageId}`)
    // 現在のルーム内の他のユーザーにメッセージ削除を通知
    socket.to(roomId).emit('deleteMessage', {
      roomId,
      messageId
    })
  })

  // 接続終了時の処理
  socket.on('disconnect', () => {
    console.log('ユーザーが切断しました:', socket.id)

    const currentRoom = userRooms.get(socket.id)
    if (currentRoom) {
      leaveRoom(socket, currentRoom, 'Unknown User')
    }
  })
}

// ルーム参加処理
function joinRoom(socket, roomId, userName) {
  socket.join(roomId)

  // ルーム管理マップを更新
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Set())
  }
  roomUsers.get(roomId).add(socket.id)
  userRooms.set(socket.id, roomId)

  console.log(`${userName}さんが${roomId}ルームに参加しました`)

  // ルーム内の他のユーザーに通知
  socket.to(roomId).emit('userJoinedRoom', {
    userName,
    roomId,
    message: `${userName}さんが${roomId}ルームに参加しました`
  })

  // 参加確認を本人に送信
  socket.emit('joinedRoom', {
    roomId,
    message: `${roomId}ルームに参加しました`,
    memberCount: roomUsers.get(roomId).size
  })
}

// ルーム退出処理
function leaveRoom(socket, roomId, userName) {
  socket.leave(roomId)

  // ルーム管理マップを更新
  if (roomUsers.has(roomId)) {
    roomUsers.get(roomId).delete(socket.id)
    if (roomUsers.get(roomId).size === 0) {
      roomUsers.delete(roomId)
    }
  }
  userRooms.delete(socket.id)

  console.log(`${userName}さんが${roomId}ルームから退出しました`)

  // ルーム内の他のユーザーに通知
  socket.to(roomId).emit('userLeftRoom', {
    userName,
    roomId,
    message: `${userName}さんが${roomId}ルームから退出しました`
  })
}