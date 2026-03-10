import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GameProvider } from './context/GameContext';
import './styles/index.css';

function setupMobileViewportStabilizer() {
  const root = document.documentElement;
  const vv = window.visualViewport;
  const ua = navigator.userAgent;
  const isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    root.classList.add('ios-device');
  }

  const syncViewportHeight = () => {
    const height = vv?.height ?? window.innerHeight;
    root.style.setProperty('--app-height', `${Math.round(height)}px`);

    // キーボード表示中はクラスを付与して微調整可能にする
    const keyboardOpen = height < window.innerHeight * 0.82;
    root.classList.toggle('keyboard-open', keyboardOpen);

    // iOSのフォーカス時にwindow側が押し下がるのを戻す
    if (window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
  };

  syncViewportHeight();
  window.addEventListener('resize', syncViewportHeight);
  window.addEventListener('orientationchange', syncViewportHeight);
  vv?.addEventListener('resize', syncViewportHeight);
  vv?.addEventListener('scroll', syncViewportHeight);
}

setupMobileViewportStabilizer();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </React.StrictMode>,
);
