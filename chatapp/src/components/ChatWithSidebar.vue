<script setup>
import { inject, ref, reactive, onMounted } from "vue"
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
const chatList = reactive([])
// #endregion

// Phase 1: シンプルなルーム状態管理
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
    expanded: false
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
// #endregion

// #region lifecycle
onMounted(() => {
  registerSocketEvent()
})
// #endregion

// #region browser event handler
// 投稿メッセージをサーバに送信する
const onPublish = () => {
  if (!chatContent.value) {
    alert("投稿内容を入力してください。")
    return
  }

  // 投稿メッセージを送信
  socket.emit("publishEvent", { userName: userName.value, content: chatContent.value })

  // 入力欄を初期化
  chatContent.value = ""
}

// 退室メッセージをサーバに送信する
const onExit = () => {
  // 退室メッセージを送信
  socket.emit("exitEvent", { userName: userName.value })

  // 入力欄を初期化
  chatContent.value = ""

  // チャット画面から退室する
  chatList.unshift(`${userName.value}さんが退室しました。`)
  router.push({ name: 'login' })
}

// メモを画面上に表示する
const onMemo = () => {
  if (!chatContent.value) {
    alert("メモの内容を入力してください。")
    return
  }
  // メモの内容を表示
  chatList.unshift(`${userName.value}さんのメモ: ${chatContent.value}`)

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
  chatList.unshift(`${data}さんが入室しました。`);

}

// サーバから受信した退室メッセージを受け取り画面上に表示する
const onReceiveExit = (data) => {
  chatList.unshift(`${data.userName}さんが退室しました。`)
}

// サーバから受信した投稿メッセージを画面上に表示する
const onReceivePublish = (data) => {
  chatList.unshift(`${data.userName}: ${data.content}`)
}
// #endregion

// #region local methods
// イベント登録をまとめる
const registerSocketEvent = () => {
  // 入室イベントを受け取ったら実行
  socket.on("enterEvent", (data) => {
    onReceiveEnter(data)
  })

  // 退室イベントを受け取ったら実行
  socket.on("exitEvent", (data) => {
    onReceiveExit(data)
  })

  // 投稿イベントを受け取ったら実行
  socket.on("publishEvent", (data) => {
    onReceivePublish(data)
  })
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
          <p>現在のルーム：{{ rooms[currentRoom]?.name }}</p>
          <textarea variant="outlined" placeholder="投稿文を入力してください" rows="4" class="area" v-model="chatContent"></textarea>
          <div class="mt-5">
            <button class="button-normal" @click="onPublish">投稿</button>
            <button class="button-normal util-ml-8px" @click="onMemo">メモ</button>
          </div>
          <div class="mt-5" v-if="chatList.length !== 0">
            <ul>
              <li class="item mt-4" v-for="(chat, i) in chatList" :key="i">{{ chat }}</li>
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
</style>