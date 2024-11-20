import { useState } from 'react'
import ChatAi from './components/CodingAiChatbot';
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <ChatAi/>
    </>
  )
}

export default App
