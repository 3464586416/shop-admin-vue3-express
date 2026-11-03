import { createStore } from 'vuex'

// 认证模块：与路由守卫共用 localStorage 的 token / user_info
const auth = {
  namespaced: true,
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user_info') || 'null')
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user,
    isAdmin: (state) => state.user && state.user.role === '超级管理员'
  },
  mutations: {
    SET_AUTH(state, { token, user }) {
      state.token = token || ''
      state.user = user || null
    },
    CLEAR_AUTH(state) {
      state.token = ''
      state.user = null
    }
  },
  actions: {
    // 从 localStorage 同步登录态（页面刷新后恢复）
    checkAuth({ commit }) {
      const token = localStorage.getItem('token')
      let user = null
      try {
        user = JSON.parse(localStorage.getItem('user_info') || 'null')
      } catch (e) {
        user = null
      }
      if (token && user) {
        commit('SET_AUTH', { token, user })
      } else {
        commit('CLEAR_AUTH')
      }
    },
    setAuth({ commit }, payload) {
      commit('SET_AUTH', payload)
    },
    logout({ commit }) {
      localStorage.removeItem('token')
      localStorage.removeItem('user_info')
      commit('CLEAR_AUTH')
    }
  }
}

export default createStore({
  modules: { auth }
})
