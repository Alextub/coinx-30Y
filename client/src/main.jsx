import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Display from './pages/Display';
import Buzzer from './pages/Buzzer';
import Admin from './pages/Admin';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Display />} />
        <Route path="/buzzer" element={<Buzzer />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </HashRouter>
  </StrictMode>
);
