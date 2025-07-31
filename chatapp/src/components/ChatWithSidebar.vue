<script setup>
import { inject, ref, reactive, onMounted, watch, nextTick, computed } from "vue"
import socketManager from '../socketManager.js'
import { useRouter } from "vue-router"
import Sidebar from "./Sidebar.vue"

// #region global state
const userName = inject("userName")
const router = useRouter()
// #endregion

// #region local variable
const socket = socketManager.getInstance()
// #endregion

// #region reactive variable
const chatContent = ref("")
// Phase 2: ルーム別メッセージ管理
const roomMessages = reactive(new Map()) // roomId -> messages[]
const currentRoom = ref('soccer-club')
const rooms = reactive({
  'soccer-club': {
    name: 'サッカー部全体',
    type: 'public',
    icon: '🏆',
    members: ['all']
  },
  'team-a': {
    name: 'Aチーム',
    type: 'team',
    icon: '📁',
    parent: 'soccer-club',
    children: ['team-a-match-a', 'team-a-match-b'],
    expanded: true
  },
  'team-a-match-a': {
    name: '試合A',
    type: 'match',
    icon: '🥅',
    parent: 'team-a'
  },
  'team-a-match-b': {
    name: '試合B',
    type: 'match',
    icon: '🥅',
    parent: 'team-a'
  },
  'team-b': {
    name: 'Bチーム',
    type: 'team',
    icon: '📁',
    parent: 'soccer-club',
    expanded: false
  },
  'team-c': {
    name: 'Cチーム',
    type: 'team',
    icon: '📁',
    parent: 'soccer-club',
    expanded: false
  }
})

// 現在のルームのメッセージリスト（computed的に）
const currentRoomMessages = computed(() => {
  return roomMessages.get(currentRoom.value) || []
})

// #region localStorage
const STORAGE_KEY = 'soccer-chat-room-messages'

// ローカルストレージからメッセージ履歴を読み込み
const loadMessagesFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsedData = JSON.parse(stored)
      Object.entries(parsedData).forEach(([roomId, messages]) => {
        if (Array.isArray(messages)) {
          roomMessages.set(roomId, messages)
        }
      })
      console.log('ローカルストレージからメッセージ履歴を復元しました')
    }
  } catch (error) {
    console.error('ローカルストレージからの読み込みに失敗:', error)
  }
}

// ローカルストレージにメッセージ履歴を保存
const saveMessagesToStorage = () => {
  try {
    const dataToStore = {}
    roomMessages.forEach((messages, roomId) => {
      // 最新100件のみ保存（メモリ使用量制限）
      dataToStore[roomId] = messages.slice(0, 100)
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore))
    console.log('ローカルストレージにメッセージ履歴を保存しました')
  } catch (error) {
    console.error('ローカルストレージへの保存に失敗:', error)
  }
}

// メッセージオブジェクトを作成するヘルパー関数
const createMessageObject = (userName, content, type = 'message') => {
  return {
    id: Date.now() + Math.random(), // 一意のID生成
    userName: userName,
    content: content,
    timestamp: new Date().toISOString(),
    type: type // 'message', 'memo', 'system'
  }
}

// メッセージ追加時にローカルストレージに自動保存
const addMessageToRoom = (roomId, messageData) => {
  const messages = roomMessages.get(roomId) || []
  
  // 文字列の場合は旧形式なのでオブジェクトに変換
  let messageObj
  if (typeof messageData === 'string') {
    // 既存の文字列メッセージを解析してオブジェクトに変換
    if (messageData.includes('さんのメモ:')) {
      const match = messageData.match(/^(.+)さんのメモ:\s*(.*)$/)
      if (match) {
        messageObj = createMessageObject(match[1], match[2], 'memo')
      } else {
        messageObj = createMessageObject('Unknown', messageData, 'memo')
      }
    } else if (messageData.includes(':')) {
      const colonIndex = messageData.indexOf(':')
      const userName = messageData.substring(0, colonIndex)
      const content = messageData.substring(colonIndex + 1).trim()
      messageObj = createMessageObject(userName, content, 'message')
    } else {
      messageObj = createMessageObject('System', messageData, 'system')
    }
  } else {
    messageObj = messageData
  }
  
  messages.push(messageObj)
  
  // 各ルーム最大200件まで保持（メモリ使用量制限）
  if (messages.length > 200) {
    messages.shift()
  }
  
  // ローカルストレージに保存
  saveMessagesToStorage()
  
  // 新しいメッセージが追加されたらスクロールを下に移動
  nextTick(() => {
    const chatArea = document.querySelector('.chat-area')
    if (chatArea) {
      chatArea.scrollTop = chatArea.scrollHeight
    }
  })
}
// #endregion

// #region lifecycle
onMounted(() => {
  // 各ルームのメッセージリストを初期化
  Object.keys(rooms).forEach(roomId => {
    roomMessages.set(roomId, [])
  })
  
  // ローカルストレージからメッセージ履歴を復元
  loadMessagesFromStorage()
  
  registerSocketEvent()
  
  // 初期ルームに参加
  joinRoom(currentRoom.value)
})

// ルーム変更を監視してSocket.IOルームを切り替え
watch(currentRoom, (newRoomId, oldRoomId) => {
  if (newRoomId !== oldRoomId) {
    switchRoom(oldRoomId, newRoomId)
  }
})
// #endregion

// #region browser event handler
// 投稿メッセージをサーバに送信する（ルーム対応版）
const onPublish = () => {
  if (!chatContent.value) {
    alert("投稿内容を入力してください。")
    return
  }

  // 現在のルームに投稿メッセージを送信
  socket.emit("publishEvent", { 
    userName: userName.value, 
    content: chatContent.value,
    roomId: currentRoom.value,
    timestamp: new Date().toISOString() // タイムスタンプを追加
  })

  // 入力欄を初期化
  chatContent.value = ""
}

// 退室メッセージをサーバに送信する
const onExit = () => {
  // 現在のルームから退出
  if (currentRoom.value) {
    socket.emit("leaveRoom", { 
      roomId: currentRoom.value, 
      userName: userName.value 
    })
  }

  // 退室メッセージを送信
  socket.emit("exitEvent", { userName: userName.value })

  // 入力欄を初期化
  chatContent.value = ""

  // チャット画面から退室する（ログのみ、メッセージには追加しない）
  // console.log(`${userName.value}さんが退室しました。`)
  
  router.push({ name: 'login' })
}

// メモを画面上に表示する
// const onMemo = () => {
//   if (!chatContent.value) {
//     alert("メモの内容を入力してください。")
//     return
//   }
  
//   // 現在のルームのメッセージリストにメモを追加
//   const memoMessage = createMessageObject(userName.value, chatContent.value, 'memo')
//   addMessageToRoom(currentRoom.value, memoMessage)

//   // 入力欄を初期化
//   chatContent.value = ""
// }

const onRoomChange = (roomId) => {
  currentRoom.value = roomId
  // console.log(`ルーム切り替え: ${rooms[roomId]?.name}`)
}
// #endregion

// #region socket event handler
// サーバから受信した入室メッセージ（ログのみ、メッセージには追加しない）
const onReceiveEnter = (data) => {
  // console.log(`${data}さんが入室しました。`)
  // addMessageToRoom(currentRoom.value, `${data}さんが入室しました。`) // コメントアウト
}

// サーバから受信した退室メッセージ（ログのみ、メッセージには追加しない）
const onReceiveExit = (data) => {
  // console.log(`${data.userName}さんが退室しました。`)
  // addMessageToRoom(currentRoom.value, `${data.userName}さんが退室しました。`) // コメントアウト
}

// サーバから受信した投稿メッセージを画面上に表示する（ルーム対応版）
const onReceivePublish = (data) => {
  const targetRoomId = data.roomId || currentRoom.value
  const messageObj = createMessageObject(
    data.userName, 
    data.content, 
    'message'
  )
  // サーバーからタイムスタンプが来た場合はそれを使用
  if (data.timestamp) {
    messageObj.timestamp = data.timestamp
  }
  addMessageToRoom(targetRoomId, messageObj)
}

// 新規: ルーム参加通知（ログのみ、メッセージには追加しない）
const onUserJoinedRoom = (data) => {
  // console.log(`ルーム参加: ${data.message}`)
  // addMessageToRoom(data.roomId, data.message) // コメントアウト
}

// 新規: ルーム退出通知（ログのみ、メッセージには追加しない）
const onUserLeftRoom = (data) => {
  // console.log(`ルーム退出: ${data.message}`)
  // addMessageToRoom(data.roomId, data.message) // コメントアウト
}

// 新規: ルーム参加確認（ログのみ、メッセージには追加しない）
const onJoinedRoom = (data) => {
  // console.log(`ルーム参加確認: ${data.roomId} - ${data.message} (メンバー数: ${data.memberCount})`)
  // addMessageToRoom(data.roomId, `${data.message} (メンバー数: ${data.memberCount})`) // コメントアウト
}
// #endregion

// #region local methods
// Socket.IOルーム切り替え処理
const switchRoom = async (oldRoomId, newRoomId) => {
  // 前のルームから退出
  if (oldRoomId) {
    socket.emit("leaveRoom", { 
      roomId: oldRoomId, 
      userName: userName.value 
    })
  }
  
  // 新しいルームに参加
  await nextTick() // DOM更新を待つ
  joinRoom(newRoomId)
}

const joinRoom = (roomId) => {
  socket.emit("joinRoom", { 
    roomId: roomId, 
    userName: userName.value 
  })
}

// ローカルストレージクリア機能
const clearMessageHistory = () => {
  if (confirm('全ルームのメッセージ履歴を削除しますか？')) {
    try {
      localStorage.removeItem(STORAGE_KEY)
      Object.keys(rooms).forEach(roomId => {
        roomMessages.set(roomId, [])
      })
      alert('メッセージ履歴を削除しました')
    } catch (error) {
      console.error('履歴削除に失敗:', error)
      alert('履歴削除に失敗しました')
    }
  }
}

// イベント登録をまとめる（Phase 2拡張版）
const registerSocketEvent = () => {
  // 既存イベント
  socket.on("enterEvent", onReceiveEnter)
  socket.on("exitEvent", onReceiveExit)
  socket.on("publishEvent", onReceivePublish)
  
  // 新規ルーム関連イベント
  socket.on("userJoinedRoom", onUserJoinedRoom)
  socket.on("userLeftRoom", onUserLeftRoom)
  socket.on("joinedRoom", onJoinedRoom)
}

// メッセージ表示用のヘルパー関数
const isMyMessage = (messageObj) => {
  if (typeof messageObj === 'object' && messageObj.userName) {
    return messageObj.userName === userName.value
  }
  // 旧形式の文字列メッセージ対応
  if (typeof messageObj === 'string') {
    return messageObj.startsWith(`${userName.value}:`) || messageObj.includes(`${userName.value}さんのメモ:`)
  }
  return false
}

const isMemoMessage = (messageObj) => {
  if (typeof messageObj === 'object' && messageObj.type) {
    return messageObj.type === 'memo'
  }
  // 旧形式の文字列メッセージ対応
  if (typeof messageObj === 'string') {
    return messageObj.includes('さんのメモ:')
  }
  return false
}

const getMessageUser = (messageObj) => {
  if (typeof messageObj === 'object' && messageObj.userName) {
    return messageObj.userName
  }
  // 旧形式の文字列メッセージ対応
  if (typeof messageObj === 'string') {
    if (messageObj.includes('さんのメモ:')) {
      const match = messageObj.match(/^(.+)さんのメモ:/)
      return match ? match[1] : 'Unknown'
    } else if (messageObj.includes(':')) {
      const parts = messageObj.split(':')
      return parts[0]
    }
  }
  return 'System'
}

const getMessageContent = (messageObj) => {
  if (typeof messageObj === 'object' && messageObj.content) {
    return messageObj.content
  }
  // 旧形式の文字列メッセージ対応
  if (typeof messageObj === 'string') {
    if (messageObj.includes('さんのメモ:')) {
      const parts = messageObj.split('さんのメモ:')
      return parts.length > 1 ? parts[1].trim() : messageObj
    } else if (messageObj.includes(':')) {
      const parts = messageObj.split(':')
      return parts.slice(1).join(':').trim()
    }
  }
  return messageObj
}

// タイムスタンプをフォーマットする関数
const formatTimestamp = (messageObj) => {
  if (typeof messageObj === 'object' && messageObj.timestamp) {
    const date = new Date(messageObj.timestamp)
    
    // 年月日時分を表示
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return `${year}/${month}/${day} ${hours}:${minutes}`
  }
  return ''
}

// メッセージにタイムスタンプがあるかチェック
const hasTimestamp = (messageObj) => {
  return typeof messageObj === 'object' && messageObj.timestamp
}
// #endregion
</script>

<template>
  <div class="chat-with-sidebar">
    <Sidebar @room-changed="onRoomChange" />
    <div class="main-content">
      <div class="mx-auto my-5 px-4">
        <h1 class="text-h3 font-weight-medium">Vue.js Chat チャットルーム</h1>
        <div class="mt-10">
          <p>ログインユーザ：{{ userName }}さん</p>
          <p>現在のルーム：{{ rooms[currentRoom]?.name }} ({{ currentRoom }})</p>
          
          <!-- チャットメッセージ表示エリア -->
          <div class="chat-area mt-5" v-if="currentRoomMessages.length !== 0">
            <h4>{{ rooms[currentRoom]?.name }} のメッセージ ({{ currentRoomMessages.length }}件):</h4>
            <p class="storage-info">※ ローカルストレージに自動保存されます</p>
            
            <div v-for="(message, i) in currentRoomMessages" :key="i" class="chat-item">
              <div class="message-container">
                <div class="message-bubble" :class="{ 
                  'my-message': isMyMessage(message),
                  'memo-message': isMemoMessage(message)
                }">
                  <div class="message-header">
                    <span class="user-name">{{ getMessageUser(message) }}</span>
                    <span v-if="hasTimestamp(message)" class="timestamp">{{ formatTimestamp(message) }}</span>
                  </div>
                  <div class="message-content">{{ getMessageContent(message) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 入力エリア -->
          <v-container class="pa-0 mt-5">
            <v-row dense>
              <v-col cols="12">
                <textarea variant="outlined" placeholder="投稿文を入力してください" rows="3" class="area" v-model="chatContent" style="width: 100%; box-sizing: border-box;"></textarea>
              </v-col>
              <v-col cols="4">
                <v-btn block color="blue-darken-4" style="color: white;" @click="onPublish">投稿</v-btn>
              </v-col>
              <!-- <v-col cols="4">
                <v-btn block color="orange-darken-2" style="color: white;" @click="onMemo">メモ</v-btn>
              </v-col> -->
              <v-col cols="4">
                <v-btn block color="red-darken-2" style="color: white;" @click="clearMessageHistory">履歴削除</v-btn>
              </v-col>
            </v-row>
          </v-container>
        </div>
        
        <!-- 退室ボタン -->
        <router-link to="/" class="link">
          <v-btn color="grey-darken-2" style="color: white; margin-top: 16px;" @click="onExit">退室する</v-btn>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-with-sidebar {
  display: flex;
  height: 100vh;
}

.main-content {
  flex: 1;
  overflow-y: auto;
}

.link {
  text-decoration: none;
}

.area {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

.area:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.storage-info {
  font-size: 12px;
  color: #666;
  margin: 4px 0;
}

/* チャットエリアのスタイル */
.chat-area {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background-color: #fafafa;
}

.chat-item {
  margin-bottom: 12px;
}

/* 投稿メッセージ（吹き出し）のスタイル */
.message-container {
  display: flex;
  width: 100%;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  background-color: #333;
  position: relative;
  margin-left: 0;
}

.message-bubble.my-message {
  background-color: #1976d2;
  margin-left: auto;
  margin-right: 0;
}

.message-bubble.memo-message {
  background-color: #ff9800;
}

.message-bubble.memo-message.my-message {
  background-color: #f57c00;
}

.message-bubble::before {
  content: '';
  position: absolute;
  top: 30px;
  left: -8px;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 8px solid #333;
}

.message-bubble.my-message::before {
  left: auto;
  right: -8px;
  border-right: none;
  border-left: 8px solid #1976d2;
}

.message-bubble.memo-message::before {
  border-right-color: #ff9800;
}

.message-bubble.memo-message.my-message::before {
  border-left-color: #f57c00;
}

.message-header {
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-name {
  flex: 1;
}

.timestamp {
  font-size: 10px;
  font-weight: normal;
  opacity: 0.8;
  margin-left: 8px;
  white-space: nowrap;
  min-width: 90px;
}

.message-content {
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
  color: white;
  white-space: pre-line;
}

/* スクロールバーのスタイル調整 */
.chat-area::-webkit-scrollbar {
  width: 6px;
}

.chat-area::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.chat-area::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.chat-area::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>