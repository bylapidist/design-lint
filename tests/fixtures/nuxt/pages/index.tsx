import styles from './index.module.css';

export default function Page() {
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
