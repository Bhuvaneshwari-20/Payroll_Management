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

        .kr-footer p {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          margin: 0;
        }

        @media (max-width: 768px) {
          .kr-footer {
            padding: 0.85rem 1rem;
            font-size: 0.78rem;
          }

          .kr-footer a {
            font-size: 13px !important;
            padding: 2px 4px !important;
          }
        }

        @media (max-width: 480px) {
          .kr-footer a {
            display: block;
          }
        }
      `}</style>
      <p>
        <span>&copy; Copyright {currentYear} Designed and Maintained by</span>
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
        <span>All rights reserved.</span>
      </p>
    </footer>
  );
}