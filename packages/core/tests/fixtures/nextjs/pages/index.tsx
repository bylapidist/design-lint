import styles from '../styles/Home.module.css';

export default function Home() {
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
