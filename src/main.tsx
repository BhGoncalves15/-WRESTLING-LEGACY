import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/barlow-condensed/latin-800.css'
import './ui/styles.css'
import { App } from './ui/app'
import { BeltPhotoProvider } from './ui/belt-photo-library'

createRoot(document.getElementById('root')!).render(<BeltPhotoProvider><App /></BeltPhotoProvider>)
