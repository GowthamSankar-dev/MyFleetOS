import { Outlet, useLocation } from 'react-router-dom'
import AnimatedBackground from './AnimatedBackground'

export default function AuthLayout() {
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <AnimatedBackground centerContent={!isLanding}>
      <Outlet />
    </AnimatedBackground>
  )
}
