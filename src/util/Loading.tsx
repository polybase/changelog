import React, { useState, useEffect, useRef } from 'react'
import { Spinner, SpinnerProps, Center } from '@chakra-ui/react'

export interface LoadingProps extends SpinnerProps {
  isLoading?: boolean
  center?: boolean
  delay?: number
}

export const Loading: React.FC<LoadingProps> = ({ isLoading, center, children, delay = 100, ...props }) => {
  const [localLoading, setLocalLoading] = useState<boolean | null>(null)
  const timer = useRef<null | number>(null)

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current)
    if (!isLoading || !delay) {
      setLocalLoading(!!isLoading)
    } else {
      timer.current = window.setTimeout(() => {
        setLocalLoading(!!isLoading)
      }, delay)
    }
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [isLoading, delay])

  if (localLoading) {
    if (center) {
      return (
        <Center>
          <Spinner
            thickness='10px'
            speed='0.65s'
            emptyColor='gray.200'
            color='brand.500'
            size='xl'
          />
        </Center>
      )
    }
    return (
      <Spinner emptyColor='gray.200' color='brand.500' size='md' {...props} />
    )
  }

  if (localLoading === null) return null

  return <>{children}</>
}
