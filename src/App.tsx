
import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ChatPage from './page/ChatPage'
import HomePage from './page/LandingPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/:name' element={<ChatPage/>}/>
        <Route path='/' element={<HomePage/>}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App
