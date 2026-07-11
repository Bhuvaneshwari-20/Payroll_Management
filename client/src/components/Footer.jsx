
export default function Footer() {

  const currentYear = new Date().getFullYear();
  return (
    <footer className="kr-footer">
      <style>{`
        .kr-footer {
          background: var(--vb-bg-surface, #fff);
          border-top: 1px solid var(--vb-border, #e6e8ec);
          color: var(--vb-text-muted, #64748b);
          text-align: center;
          padding: 1rem 1.5rem;
          font-size: 0.85rem;
          transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        }

        .kr-footer a {
          transition: color 0.2s ease;
        }

        .kr-footer a:hover {
          color: var(--vb-orange-dark, #cf5323);
        }
      `}</style>
      <p className="mb-0">
        &copy; Copyright {currentYear} Designed and Maintained by{' '}
        <a
          href="https://tih.mkce.ac.in"
          style={{
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '16px',
            color: 'var(--vb-orange, #e8622c)',
            padding: '4px 8px',
          }}
        >
          Technology Innovation Hub (TIH) - M.Kumarasamy College of Engineering
        </a>
        All rights reserved.
      </p>
    </footer>
  );
}