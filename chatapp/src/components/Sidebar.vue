<script setup>
import { ref, reactive, onMounted } from 'vue'

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
// #endregion

// #region emits
// 親コンポーネントに渡すイベントを定義
const emit = defineEmits(['room-changed'])
// #endregion

// #region methods
const selectRoom = (roomId) => {
  currentRoom.value = roomId
  emit('room-changed', roomId)
}

const getRoomsByParent = (parentId) => {
  return Object.entries(rooms)
    .filter(([, room]) => room.parent === parentId)
    .map(([id, room]) => ({ id, ...room }))
}

const isRoomActive = (roomId) => {
  return currentRoom.value === roomId
}

const toggleExpand = (roomId) => {
  if (rooms[roomId] && rooms[roomId].children) {
    rooms[roomId].expanded = !rooms[roomId].expanded
  }
}
// #endregion

// #region lifecycle
onMounted(() => {
  emit('room-changed', currentRoom.value)
})
// #endregion
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>チャットルーム</h3>
    </div>
    
    <div class="room-list">
      <!-- サッカー部全体（トップレベル） -->
      <div 
        class="room-item top-level"
        :class="{ active: isRoomActive('soccer-club') }"
        @click="selectRoom('soccer-club')"
      >
        <span class="room-icon">{{ rooms['soccer-club'].icon }}</span>
        <span class="room-name">{{ rooms['soccer-club'].name }}</span>
      </div>

      <!-- チームレベル -->
      <div v-for="team in getRoomsByParent('soccer-club')" :key="team.id" class="team-section">
        <div 
          class="room-item team-level"
          :class="{ active: isRoomActive(team.id) }"
          @click="selectRoom(team.id)"
        >
          <span 
            class="expand-icon"
            v-if="team.children && team.children.length > 0"
            @click.stop="toggleExpand(team.id)"
          >
            {{ team.expanded ? '▼' : '▶' }}
          </span>
          <span class="room-icon">{{ team.icon }}</span>
          <span class="room-name">{{ team.name }}</span>
        </div>

        <!-- マッチレベル -->
        <div v-if="team.expanded && team.children" class="match-section">
          <div 
            v-for="matchId in team.children" 
            :key="matchId"
            class="room-item match-level"
            :class="{ active: isRoomActive(matchId) }"
            @click="selectRoom(matchId)"
          >
            <span class="room-icon">{{ rooms[matchId].icon }}</span>
            <span class="room-name">{{ rooms[matchId].name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 250px;
  height: 100vh;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
  overflow-y: auto;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #ddd;
  background-color: #fff;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.room-list {
  padding: 8px 0;
}

.room-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.room-item:hover {
  background-color: #e8e8e8;
}

.room-item.active {
  background-color: #007acc;
  color: white;
}

.room-item.active:hover {
  background-color: #005a9e;
}

.top-level {
  font-weight: 600;
  font-size: 16px;
}

.team-level {
  padding-left: 24px;
  font-weight: 500;
}

.match-level {
  padding-left: 48px;
  font-size: 14px;
}

.expand-icon {
  margin-right: 4px;
  font-size: 12px;
  min-width: 12px;
  cursor: pointer;
  user-select: none;
}

.room-icon {
  margin-right: 8px;
  font-size: 16px;
}

.room-name {
  flex: 1;
}

.team-section {
  margin-bottom: 4px;
}

.match-section {
  margin-left: 8px;
}
</style>