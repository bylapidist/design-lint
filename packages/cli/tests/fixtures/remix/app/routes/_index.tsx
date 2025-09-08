import styles from '../styles.module.css';

export default function Index() {
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

export function links() {
  return [{ rel: 'stylesheet', href: styles }];
}
