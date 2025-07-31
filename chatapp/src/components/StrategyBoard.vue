<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  currentRoom: {
    type: String,
    required: true
  },
  roomData: {
    type: Object,
    required: true
  }
})

// 編集モード管理
const isEditMode = ref(false)
const strategyText = ref('')

// 現在の戦略データを取得
const currentStrategy = computed(() => {
  return props.roomData?.strategy || ''
})

// 戦略テキストを初期化
const initStrategyText = () => {
  strategyText.value = currentStrategy.value || ''
}

// 編集開始
const startEdit = () => {
  isEditMode.value = true
  initStrategyText()
}

// 編集キャンセル
const cancelEdit = () => {
  isEditMode.value = false
  strategyText.value = ''
}

// 保存処理
const saveEdit = () => {
  // ローカルストレージに保存
  const savedData = JSON.parse(localStorage.getItem('strategyData') || '{}')
  savedData[props.currentRoom] = strategyText.value
  localStorage.setItem('strategyData', JSON.stringify(savedData))
  
  // roomDataを更新（これは理想的にはemitで親コンポーネントに通知すべき）
  if (props.roomData) {
    props.roomData.strategy = strategyText.value
  }
  
  isEditMode.value = false
  alert('保存しました')
}

// コンポーネント初期化時にローカルストレージからデータを読み込み
const loadStoredData = () => {
  const savedData = JSON.parse(localStorage.getItem('strategyData') || '{}')
  if (savedData[props.currentRoom] && props.roomData) {
    props.roomData.strategy = savedData[props.currentRoom]
  }
}

// 初期化
loadStoredData()
</script>

<template>
  <div class="strategy-board">
    <div class="strategy-header">
      <h3 class="strategy-title">
        {{ roomData?.name || 'ルーム情報' }}のボード
      </h3>
      
      <!-- 編集ボタン -->
      <div class="edit-controls">
        <v-btn 
          v-if="!isEditMode && currentStrategy" 
          size="small" 
          color="primary" 
          @click="startEdit"
        >
          編集
        </v-btn>
        <div v-if="isEditMode" class="edit-buttons">
          <v-btn size="small" color="success" @click="saveEdit">
            保存
          </v-btn>
          <v-btn size="small" color="error" @click="cancelEdit" class="ml-2">
            キャンセル
          </v-btn>
        </div>
      </div>
    </div>

    <div class="strategy-content">
      <!-- 編集モード -->
      <div v-if="isEditMode" class="edit-mode">
        <v-textarea
          v-model="strategyText"
          label="作戦内容を入力してください"
          rows="20"
          variant="outlined"
          placeholder="ここに作戦や情報を自由に入力してください"
          class="strategy-textarea"
        />
      </div>

      <!-- 表示モード -->
      <div v-else class="display-mode">
        <div v-if="currentStrategy" class="strategy-display">
          <pre class="strategy-text">{{ currentStrategy }}</pre>
        </div>
        <div v-else class="no-strategy">
          <div class="text-center">
            <p class="mb-4">まだ作戦データがありません</p>
            <v-btn color="primary" @click="startEdit">
              新規作成
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.strategy-board {
  width: 500px;
  height: 100vh;
  background-color: #f8f9fa;
  border-left: 1px solid #e0e0e0;
  overflow-y: auto;
  padding: 16px;
}

.strategy-header {
  margin-bottom: 16px;
}

.strategy-title {
  font-size: 18px;
  margin-bottom: 20px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.strategy-content {
  flex: 1;
}

.position-group {
  margin-bottom: 8px;
  font-size: 14px;
}

.position-label {
  font-weight: 600;
  color: #1976d2;
  min-width: 30px;
  display: inline-block;
}

.memo-text {
  line-height: 1.6;
  color: #555;
}

.no-strategy {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

/* スクロールバーのスタイル */
.strategy-board::-webkit-scrollbar {
  width: 6px;
}

.strategy-board::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.strategy-board::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.strategy-board::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
