import React from 'react';
import styles from './App.module.css';

export function App() {
  const color = '#ffffff';
  const padding = 5;
  const token = 'old-token';
  return (
    <div className={styles.container} style={{ padding }}>
      Hello
      <button>Click</button>
      <OldComponent />
    </div>
  );
}
