import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import ImageGenerator from './pages/ImageGenerator'
import FlowPage from './pages/FlowPage'

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<ImageGenerator />} />
        <Route path="/flow" element={<FlowPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
