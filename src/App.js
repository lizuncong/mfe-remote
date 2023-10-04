import "./App.css";
import Button from "./components/Button";
import axios from "axios";
function App() {
  console.log('axios..', axios)
  return (
    <div className="App">
      <header className="App-header">主应用，提供远程模块供子应用消费</header>
      <div>
        <Button />
      </div>
    </div>
  );
}

export default App;
