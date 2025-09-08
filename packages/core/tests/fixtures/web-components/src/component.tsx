export class MyComponent extends HTMLElement {
  render() {
    const color = '#ffffff';
    const padding = 5;
    const token = 'old-token';
    return (
      <div className="container" style={{ padding }}>
        Hello
        <button>Click</button>
        <OldComponent />
      </div>
    );
  }
}
