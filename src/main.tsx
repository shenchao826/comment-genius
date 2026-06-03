import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './i18n';
import './index.css';

// Render immediately — no rAF delay to maximize FCP/LCP
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
