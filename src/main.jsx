import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
// 800 is --weight-black: the masthead, panel titles, day headings. Without this
// file the browser synthesises a fake bold off 700, and every platform fakes it
// differently -- which is why the title looked wrong on desktop but fine on iOS.
import '@fontsource/manrope/800.css'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
