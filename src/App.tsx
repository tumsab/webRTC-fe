
import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ChatPage from './page/ChatPage'
import { LandingPage } from './page/LandingPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/chatrandom/:name' element={<ChatPage/>}/>
        <Route path='/' element={<LandingPage/>}/>
      </Routes>

    </BrowserRouter>
  )
}

export default App
