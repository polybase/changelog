import { ColorModeScript } from '@chakra-ui/react'
import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import posthog from 'posthog-js'
import { App } from './App'
import reportWebVitals from './reportWebVitals'
import * as serviceWorker from './serviceWorker'

const {
  REACT_APP_ENV_NAME,
} = process.env

// Analytics
posthog.init('phc_DBZY8MbRdRIIwSwX4ZSwTAjy5ogdQPDMVdPObOuQQf', { api_host: 'https://a.polybase.xyz' })
// Only log in testnet
if (REACT_APP_ENV_NAME === 'testnet') {
  posthog.opt_in_capturing()
} else {
  posthog.opt_out_capturing()
}

const container = document.getElementById('root')
if (!container) throw new Error('Failed to find the root element')
const root = ReactDOM.createRoot(container)

root.render(
  <React.StrictMode>
    <ColorModeScript />
    <App />
  </React.StrictMode>,
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorker.unregister()

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()

