import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Footer from '../components/Footer';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={`kr-wrapper ${sidebarOpen ? '' : 'kr-sidebar-collapsed'}`}>
      <Sidebar />
      <div className="kr-main">
        <Topbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <div className="p-4" id="kr-content">
          <Outlet />
        </div>
        <Footer />
      </div>
    </div>
  );
}