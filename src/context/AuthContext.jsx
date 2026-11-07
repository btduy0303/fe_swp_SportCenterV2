import React, { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Tự động kiểm tra danh tính và lấy profile người dùng khi có token
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data)
        } else {
          // Token không hợp lệ hoặc đã hết hạn
          logout()
        }
      } catch (err) {
        console.error('Lỗi xác thực người dùng:', err)
        logout()
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [token])

  // Đăng nhập và lưu token theo từng tab (sessionStorage), để mở nhiều tài khoản cùng lúc không đè nhau
  const login = (newToken, userData) => {
    sessionStorage.setItem('token', newToken)
    setToken(newToken)
    if (userData) {
      setUser(userData)
    }
  }

  // Đăng xuất và dọn sạch dữ liệu phiên làm việc
  const logout = () => {
    sessionStorage.removeItem('token')
    setToken('')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
