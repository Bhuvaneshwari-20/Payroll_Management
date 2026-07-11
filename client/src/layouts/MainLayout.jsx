import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Footer from '../components/Footer';
import ForcePasswordChangeModal from '../components/ForcePasswordChangeModal';
import useForcePasswordChange from '../utils/useForcePasswordChange';

// ---------------------------------------------------------------------------
// Vertex Bank — MainLayout
// This is the shell that wraps every page. It previously had no background
// styling at all, so any area not covered by an inner component's own div
// (e.g. short pages, the gap below the dashboard content, page transitions)
// fell back to the browser's default white — that's the "white gap" in dark
// mode. Now every layer here explicitly uses var(--vb-bg-page).
// ---------------------------------------------------------------------------

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Runs once per authenticated session, on every protected page —
  const { mustChange, employeeCode, checked, clear } = useForcePasswordChange();

  return (
    <div className={`kr-wrapper ${sidebarOpen ? '' : 'kr-sidebar-collapsed'}`}>
      <style>{`
        .kr-wrapper {
          display: flex;
          min-height: 100vh;
          background: var(--vb-bg-page, #f2f3f5);
          transition: background 0.3s ease;
        }

        .kr-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--vb-bg-page, #f2f3f5);
          transition: background 0.3s ease;
        }

        #kr-content {
          flex: 1;
        }
      `}</style>

      <Sidebar />
      <div className="kr-main">
        <Topbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <div className="p-4" id="kr-content">
          <Outlet />
        </div>
        <Footer />
      </div>

      {checked && mustChange && (
        <ForcePasswordChangeModal
          employeeCode={employeeCode}
          onSuccess={clear}
        />
      )}
    </div>
  );
}