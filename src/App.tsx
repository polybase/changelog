import {
  ChakraProvider,
} from '@chakra-ui/react'
import { PolybaseProvider, AuthProvider } from '@polybase/react'
import theme from './theme/theme'
import { Home } from './Home'
import { Polybase } from '@polybase/client'
import { Auth } from '@polybase/auth'

const db = new Polybase({
  baseURL: `${process.env.REACT_APP_API_URL}/v0`,
  defaultNamespace: 'polybase/apps/changelog',
})

const auth = new Auth()

export const App = () => (
  <ChakraProvider theme={theme}>
    <PolybaseProvider polybase={db}>
      <AuthProvider auth={auth} polybase={db}>
        <Home />
      </AuthProvider>
    </PolybaseProvider>
  </ChakraProvider>
)
