import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthBootstrap } from '@/components/common/AuthBootstrap'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import ServerError from '@/pages/ServerError'

export function AppRouter() {
  return (
    <HashRouter>
      <AuthBootstrap>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="/500" element={<ServerError />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthBootstrap>
    </HashRouter>
  )
}
