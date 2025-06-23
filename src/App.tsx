import { Routes, Route } from "react-router-dom";
import Home from "./Pages/Home/Home";
import Report from "./Pages/Report/Report";
import Login from "./Pages/Auth/Login";


function App() {
  return (
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/report" element={<Report/>} />
      <Route path="/login" element={<Login/>} />

    </Routes>
  );
}

export default App;