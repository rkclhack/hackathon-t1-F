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

// メッセージ追加時にローカルストレージに自動保存
const addMessageToRoom = (roomId, message) => {
  const messages = roomMessages.get(roomId) || []
  messages.unshift(message)
  
  // 各ルーム最大200件まで保持（メモリ使用量制限）
  if (messages.length > 200) {
    messages.splice(200)
  }
  
  // ローカルストレージに保存
  saveMessagesToStorage()
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
    roomId: currentRoom.value
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

  // チャット画面から退室する
  const message = `${userName.value}さんが退室しました。`
  addMessageToRoom(currentRoom.value, message)
  
  router.push({ name: 'login' })
}

// メモを画面上に表示する
const onMemo = () => {
  if (!chatContent.value) {
    alert("メモの内容を入力してください。")
    return
  }
  
  // 現在のルームのメッセージリストにメモを追加
  const message = `${userName.value}さんのメモ: ${chatContent.value}`
  addMessageToRoom(currentRoom.value, message)

  // 入力欄を初期化
  chatContent.value = ""
}

const onRoomChange = (roomId) => {
  currentRoom.value = roomId
  console.log(`ルーム切り替え: ${rooms[roomId]?.name}`)
}
// #endregion

// #region socket event handler
// サーバから受信した入室メッセージ画面上に表示する
const onReceiveEnter = (data) => {
  const message = `${data}さんが入室しました。`
  addMessageToRoom(currentRoom.value, message)
}

// サーバから受信した退室メッセージを受け取り画面上に表示する
const onReceiveExit = (data) => {
  const message = `${data.userName}さんが退室しました。`
  addMessageToRoom(currentRoom.value, message)
}

// サーバから受信した投稿メッセージを画面上に表示する（ルーム対応版）
const onReceivePublish = (data) => {
  const targetRoomId = data.roomId || currentRoom.value
  const message = `${data.userName}: ${data.content}`
  addMessageToRoom(targetRoomId, message)
}

// 新規: ルーム参加通知
const onUserJoinedRoom = (data) => {
  addMessageToRoom(data.roomId, data.message)
}

// 新規: ルーム退出通知
const onUserLeftRoom = (data) => {
  addMessageToRoom(data.roomId, data.message)
}

// 新規: ルーム参加確認
const onJoinedRoom = (data) => {
  console.log(`ルーム参加確認: ${data.roomId}`)
  const message = `${data.message} (メンバー数: ${data.memberCount})`
  addMessageToRoom(data.roomId, message)
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
          <textarea variant="outlined" placeholder="投稿文を入力してください" rows="4" class="area" v-model="chatContent"></textarea>
          <div class="mt-5">
            <button class="button-normal" @click="onPublish">投稿</button>
            <button class="button-normal util-ml-8px" @click="onMemo">メモ</button>
            <button class="button-normal util-ml-8px" @click="clearMessageHistory">履歴削除</button>
          </div>
          <div class="mt-5" v-if="currentRoomMessages.length !== 0">
            <h4>{{ rooms[currentRoom]?.name }} のメッセージ ({{ currentRoomMessages.length }}件):</h4>
            <p class="storage-info">※ ローカルストレージに自動保存されます</p>
            <ul>
              <li class="item mt-4" v-for="(chat, i) in currentRoomMessages" :key="i">{{ chat }}</li>
            </ul>
          </div>
        </div>
        <router-link to="/" class="link">
          <button type="button" class="button-normal button-exit" @click="onExit">退室する</button>
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
  width: 500px;
  border: 1px solid #000;
  margin-top: 8px;
}

.item {
  display: block;
}

.util-ml-8px {
  margin-left: 8px;
}

.button-exit {
  color: #fff;
  margin-top: 8px;
}

.storage-info {
  font-size: 12px;
  color: #666;
  margin: 4px 0;
}
</style>