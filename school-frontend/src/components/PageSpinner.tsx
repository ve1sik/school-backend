export default function PageSpinner() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f7fe',
        fontFamily: 'system-ui, sans-serif',
        color: '#6b7280',
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      Загрузка…
    </div>
  );
}
