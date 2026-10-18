import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import MobileNav from './MobileNav';
import Footer from './Footer';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();

  // Desktop default open, tablet (768-1024) default collapsed
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const isAuthPage = ['/login', '/register', '/reset-password'].includes(location.pathname);
  const isLandingPage = location.pathname === '/';
  const isProfilePage = location.pathname === '/profile' || location.pathname === '/user/profile';
  const needsMobile = Boolean(user && (!user.phone || !user.phone.trim()));

  // If user is authenticated but has not provided a mobile number, block access to all other pages
  if (user && needsMobile && !isProfilePage) {
    return <Navigate to="/profile" replace />;
  }

  // Shared pages (like /society/contribute, /contact) render with Sidebar when logged in, or with Footer when guest
  const showAuthenticatedLayout = Boolean(user && !isAuthPage && !isLandingPage);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 flex flex-col font-body selection:bg-brand-500/30 selection:text-white transition-colors duration-200">
      {/* Compact Navbar (52px height) */}
      <Navbar onToggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />

      {/* Authenticated Layout: Sidebar + Breadcrumbs + Content */}
      {showAuthenticatedLayout ? (
        <div className="flex-1 flex pt-[52px]">
          {/* Sidebar */}
          <Sidebar isCollapsed={isSidebarCollapsed} onCloseMobile={() => {}} />

          {/* Main Content Area */}
          <div
            className={`flex-1 flex flex-col transition-all duration-200 ${
              isSidebarCollapsed ? 'md:pl-16' : 'md:pl-60'
            }`}
          >
            <Breadcrumbs />
            <main id="main-content" className="flex-1 p-3.5 sm:p-6 pb-20 md:pb-8 max-w-7xl w-full mx-auto">
              <Outlet />
            </main>
          </div>

          {/* Mobile Bottom Navigation */}
          <MobileNav />
        </div>
      ) : (
        /* Public Pages Layout */
        <>
          <main id="main-content" className="flex-1 pt-[52px] w-full">
            <Outlet />
          </main>
          {!isAuthPage && <Footer />}
        </>
      )}
    </div>
  );
}
