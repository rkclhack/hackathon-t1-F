<script setup>
import { computed } from 'vue'

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

// モックデータ
const strategyData = {
  'team-a-match-a': {
    opponent: {
      name: '○○高校',
      formation: '4-4-2',
      strengths: ['速攻', 'セットプレー', '右サイド攻撃'],
      weaknesses: ['左サイド守備', '後半スタミナ', '高いボール対応']
    },
    ourTactics: {
      formation: '4-3-3',
      keyPoints: ['右サイド攻撃', '中盤プレス', 'セットプレー対策'],
      players: {
        gk: '田中',
        df: ['佐藤', '鈴木', '高橋', '渡辺'],
        mf: ['山田', '中村', '小林'],
        fw: ['加藤', '吉田', '松本']
      }
    },
    memo: '前半は様子見で相手の動きを分析。後半15分頃から積極的に攻める。セットプレーでの失点に注意。',
    matchInfo: {
      date: '2025-08-15',
      time: '14:00',
      venue: '市民総合運動場',
      weather: '晴れ（予報）'
    }
  },
  'team-a-match-b': {
    opponent: {
      name: '△△中学',
      formation: '3-5-2',
      strengths: ['中盤の厚み', 'カウンター', '個人技'],
      weaknesses: ['サイド攻撃', 'セットプレー守備', '連携ミス']
    },
    ourTactics: {
      formation: '4-2-3-1',
      keyPoints: ['サイド攻撃', 'ショートパス', '守備の連携'],
      players: {
        gk: '田中',
        df: ['伊藤', '鈴木', '高橋', '佐々木'],
        mf: ['山田', '中村', '小林', '森田', '武田'],
        fw: ['加藤']
      }
    },
    memo: '相手の個人技に惑わされず、組織的な守備を心がける。サイドからの攻撃で数的優位を作る。',
    matchInfo: {
      date: '2025-08-22',
      time: '10:00',
      venue: '学校グラウンド',
      weather: '曇り（予報）'
    }
  },
  'team-a': {
    teamInfo: {
      philosophy: 'チーム一丸となって勝利を目指す',
      goals: ['県大会出場', '全員の技術向上', 'チームワーク強化'],
      practiceSchedule: [
        { day: '月', time: '16:00-18:00', menu: '基礎練習' },
        { day: '火', time: '16:00-18:00', menu: 'シュート練習' },
        { day: '水', time: '16:00-18:00', menu: '戦術練習' },
        { day: '木', time: '16:00-18:00', menu: 'フィジカル' },
        { day: '金', time: '16:00-18:00', menu: '実戦練習' }
      ]
    }
  },
  'soccer-club': {
    announcements: [
      { date: '2025-07-30', title: '夏合宿について', content: '8月10日〜12日に山中湖で合宿を行います' },
      { date: '2025-07-28', title: '練習試合結果', content: 'Aチーム 2-1 勝利、Bチーム 1-3 敗北' }
    ],
    schedule: [
      { date: '2025-08-05', event: '練習試合 vs ××中学' },
      { date: '2025-08-10', event: '夏合宿開始' },
      { date: '2025-08-15', event: '公式戦 vs ○○高校' }
    ]
  }
}

console.log(strategyData['soccer-club'])

const currentStrategy = computed(() => {
  return strategyData[props.currentRoom] || null
})

const isMatchRoom = computed(() => {
  return props.roomData?.type === 'match'
})

const isTeamRoom = computed(() => {
  return props.roomData?.type === 'team'
})

const isClubRoom = computed(() => {
  return props.currentRoom === 'soccer-club'
})
</script>

<template>
  <div class="strategy-board">
    <div class="strategy-header">
      <h3 class="strategy-title">
        <v-icon>{{ roomData?.icon || '📋' }}</v-icon>
        {{ roomData?.name || 'ルーム情報' }}
      </h3>
    </div>

    <div class="strategy-content">
      <!-- 試合ルームの場合 -->
      <div v-if="isMatchRoom && currentStrategy" class="match-strategy">
        <!-- 試合情報 -->
        <v-card class="mb-4" elevation="2">
          <v-card-title class="text-h6 bg-blue-lighten-4">
            <v-icon class="mr-2">🏟️</v-icon>
            試合情報
          </v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="6">
                <strong>日時:</strong> {{ currentStrategy.matchInfo?.date }} {{ currentStrategy.matchInfo?.time }}
              </v-col>
              <v-col cols="6">
                <strong>会場:</strong> {{ currentStrategy.matchInfo?.venue }}
              </v-col>
              <v-col cols="12">
                <strong>天気:</strong> {{ currentStrategy.matchInfo?.weather }}
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- 対戦相手情報 -->
        <v-card class="mb-4" elevation="2">
          <v-card-title class="text-h6 bg-red-lighten-4">
            <v-icon class="mr-2">🎯</v-icon>
            対戦相手: {{ currentStrategy.opponent?.name }}
          </v-card-title>
          <v-card-text>
            <div class="mb-3">
              <strong>フォーメーション:</strong> {{ currentStrategy.opponent?.formation }}
            </div>
            <v-row>
              <v-col cols="6">
                <div class="mb-2"><strong>強み:</strong></div>
                <v-chip 
                  v-for="strength in currentStrategy.opponent?.strengths" 
                  :key="strength"
                  class="ma-1" 
                  color="red-lighten-1" 
                  size="small"
                >
                  {{ strength }}
                </v-chip>
              </v-col>
              <v-col cols="6">
                <div class="mb-2"><strong>弱点:</strong></div>
                <v-chip 
                  v-for="weakness in currentStrategy.opponent?.weaknesses" 
                  :key="weakness"
                  class="ma-1" 
                  color="green-lighten-1" 
                  size="small"
                >
                  {{ weakness }}
                </v-chip>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- 自チーム戦術 -->
        <v-card class="mb-4" elevation="2">
          <v-card-title class="text-h6 bg-green-lighten-4">
            <v-icon class="mr-2">⚽</v-icon>
            自チーム戦術
          </v-card-title>
          <v-card-text>
            <div class="mb-3">
              <strong>フォーメーション:</strong> {{ currentStrategy.ourTactics?.formation }}
            </div>
            <div class="mb-3">
              <strong>重要ポイント:</strong>
              <div class="mt-1">
                <v-chip 
                  v-for="point in currentStrategy.ourTactics?.keyPoints" 
                  :key="point"
                  class="ma-1" 
                  color="blue-lighten-1" 
                  size="small"
                >
                  {{ point }}
                </v-chip>
              </div>
            </div>
            <div class="players-section">
              <strong>選手配置:</strong>
              <div class="mt-2">
                <div class="position-group">
                  <span class="position-label">GK:</span> {{ currentStrategy.ourTactics?.players?.gk }}
                </div>
                <div class="position-group">
                  <span class="position-label">DF:</span> {{ currentStrategy.ourTactics?.players?.df?.join(', ') }}
                </div>
                <div class="position-group">
                  <span class="position-label">MF:</span> {{ currentStrategy.ourTactics?.players?.mf?.join(', ') }}
                </div>
                <div class="position-group">
                  <span class="position-label">FW:</span> {{ currentStrategy.ourTactics?.players?.fw?.join(', ') }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- 戦術メモ -->
        <v-card elevation="2">
          <v-card-title class="text-h6 bg-orange-lighten-4">
            <v-icon class="mr-2">📝</v-icon>
            戦術メモ
          </v-card-title>
          <v-card-text>
            <p class="memo-text">{{ currentStrategy.memo }}</p>
          </v-card-text>
        </v-card>
      </div>

      <!-- チームルームの場合 -->
      <div v-else-if="isTeamRoom && currentStrategy" class="team-strategy">
        <v-card class="mb-4" elevation="2">
          <v-card-title class="text-h6 bg-blue-lighten-4">
            <v-icon class="mr-2">🎯</v-icon>
            チーム方針
          </v-card-title>
          <v-card-text>
            <p><strong>理念:</strong> {{ currentStrategy.teamInfo?.philosophy }}</p>
            <div class="mt-3">
              <strong>目標:</strong>
              <ul class="mt-2">
                <li v-for="goal in currentStrategy.teamInfo?.goals" :key="goal">
                  {{ goal }}
                </li>
              </ul>
            </div>
          </v-card-text>
        </v-card>

        <v-card elevation="2">
          <v-card-title class="text-h6 bg-green-lighten-4">
            <v-icon class="mr-2">📅</v-icon>
            練習スケジュール
          </v-card-title>
          <v-card-text>
            <v-list dense>
              <v-list-item 
                v-for="practice in currentStrategy.teamInfo?.practiceSchedule" 
                :key="practice.day"
                class="px-0"
              >
                <v-list-item-title>
                  <strong>{{ practice.day }}曜日:</strong> {{ practice.time }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ practice.menu }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </div>

      <!-- クラブ全体ルームの場合 -->
      <div v-else-if="isClubRoom && currentStrategy" class="club-strategy">
        <v-card class="mb-4" elevation="2">
          <v-card-title class="text-h6 bg-purple-lighten-4">
            <v-icon class="mr-2">📢</v-icon>
            お知らせ
          </v-card-title>
          <v-card-text>
            <v-list dense>
              <v-list-item 
                v-for="announcement in currentStrategy.announcements" 
                :key="announcement.date"
                class="px-0 mb-2"
              >
                <v-list-item-title>
                  <strong>{{ announcement.title }}</strong>
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ announcement.date }} - {{ announcement.content }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card elevation="2">
          <v-card-title class="text-h6 bg-teal-lighten-4">
            <v-icon class="mr-2">📅</v-icon>
            今後の予定
          </v-card-title>
          <v-card-text>
            <v-list dense>
              <v-list-item 
                v-for="item in currentStrategy.schedule" 
                :key="item.date"
                class="px-0"
              >
                <v-list-item-title>
                  <strong>{{ item.date }}</strong>
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ item.event }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </div>

      <!-- データが無い場合 -->
      <div v-else class="no-strategy">
        <!-- 入力されていません -->
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
