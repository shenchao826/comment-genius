import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './i18n';
import './index.css';

function mountApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
}

if (typeof requestAnimationFrame !== 'undefined') {
  requestAnimationFrame(() => {
    setTimeout(mountApp, 0);
  });
} else {
  mountApp();
}
