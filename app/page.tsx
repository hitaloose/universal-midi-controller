'use client'

import dynamic from 'next/dynamic'

const ControllerPage = dynamic(() => import('@/components/ControllerPage'), {
  ssr: false,
  loading: () => null,
})

export default function Home() {
  return <ControllerPage />
}
