// src/App.tsx - REVISED COMPLETE & FINAL VERSION with Global QR Scanner Toggle and Draggable Window
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axiosInstance from './api/axiosConfig'; // Import axios instance

// Import icons
import {
  LayoutDashboard, Users, UserCog, Package, CalendarCheck,
  Menu, // Hamburger icon for toggle
  ChevronLeft, // Left arrow for collapsing (will not be used for 
  ScanLine, // Icon for scanner toggle
  DollarSign,
  BarChart4 // NEW: Icon for Payments
} from 'lucide-react';



// Import your page components
import LoginPage from './pages/LoginPage.tsx';
import ReportsPage from './pages/ReportsPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import UsersPage from './pages/UsersPage.tsx';
import TrainersPage from './pages/TrainersPage.tsx';
import MembershipPlansPage from './pages/MembershipPlansPage.tsx';
import AttendancePage from './pages/AttendancePage.tsx';
import DraggableScannerWindow from './components/DraggableScannerWindow.tsx';
import PaymentsPage from './pages/PaymentsPage.tsx'; // NEW: Import PaymentsPage


// --- New Interfaces (retained from previous steps) ---
interface User {
  userId: number;
  name: string;
  contactNumber: string;
}

interface AttendanceResponseDTO {
    attendanceId: number;
    userId: number;
    userName: string;
    checkInTime: string;
    checkOutTime?: string;
    timeSpentMinutes?: number;
}

interface ErrorResponseDTO {
  message: string;
  status: number;
  timestamp: number;
}
// --- End New Interfaces ---

// PrivateRoute component to protect routes
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-700">
        <p className="text-lg">Loading authentication...</p>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const { isAuthenticated, 
 logout, user, loading } = useAuth();
  const location = useLocation();

  // isSidebarOpen now controls the *sticky* open state (after click)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  // isHovering only for desktop, allows temporary expansion when not sticky-open
  const [isHovering, setIsHovering] = useState(false); // REINSTATED
  const sidebarRef = useRef<HTMLElement>(null);

  // --- GLOBAL QR SCANNER STATE & LOGIC ---
  const [showGlobalQrScanner, setShowGlobalQrScanner] = useState(false);
  const [globalQrScanError, setGlobalQrScanError] = useState<string | null>(null);
  const [lastScannedUser, setLastScannedUser] = useState<{ userId: number; name: string } | null>(null);
  const [lastAttendanceRecord, setLastAttendanceRecord] = useState<AttendanceResponseDTO | null>(null);
  const [scannerWindowPosition, setScannerWindowPosition] = useState({ x: window.innerWidth - 350, y: 80 });

  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      setIsMobileView(newIsMobile);
      // On desktop, if it was mobile open, collapse it by default.
      if (!newIsMobile && isSidebarOpen && window.innerWidth >= 768) {
          // If it was open (sticky) on mobile, keep it sticky open on desktop.
      } else if (newIsMobile && !isSidebarOpen) {
          // On mobile, if not explicitly opened, it should be closed
          setIsSidebarOpen(false);
      }
      setIsHovering(false); // Reset hover state on resize
      setScannerWindowPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 300),
        y: Math.min(prev.y, window.innerHeight - 300)
      }));
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]); // isSidebarOpen is a dependency as it was.

  // --- REINSTATED handleClickOutside useEffect ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close if sidebar is explicitly open (isSidebarOpen is true) AND not in mobile view
      // On mobile, 
      if (isSidebarOpen && !isMobileView && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false); // Close sidebar only if it's sticky-open and desktop
      }
    };
    // Attach listener only if sidebar is open and on desktop
    if (isSidebarOpen && !isMobileView) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
 
  }, [isSidebarOpen, isMobileView]);


  // Function to toggle the sticky open state (called by hamburger icon)
  const handleToggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
    setIsHovering(false); // Disable hover state when explicitly toggled
  };


  // --- Scanner Logic (retained) ---
  const handleScanCheckInOrOut = useCallback(async (userId: number, userName?: string) => {
    let nameToUse = userName;
    try {
      if (!nameToUse) {
        const userDetailsResponse = await axiosInstance.get<User[]>(`/dashboard/users/search`, { params: { query: userId.toString() } });
    
     if (userDetailsResponse.data.length > 0) {
          nameToUse = userDetailsResponse.data[0].name;
        } else {
          nameToUse = `User ID: ${userId}`;
        }
      }

      const response = await axiosInstance.post<AttendanceResponseDTO>('/attendance/record', { userId: userId });
      setLastAttendanceRecord(response.data);
      setLastScannedUser({ userId, name: nameToUse || 'Unknown' });
      if (response.data.checkOutTime) 
 {
        toast.success(`${nameToUse || 'Unknown User'} has checked out!`);
      } else {
        toast.success(`${nameToUse || 'Unknown User'} has checked in!`);
      }
      setGlobalQrScanError(null);
    } catch (err: any) {
      console.error('QR Check-in/out failed:', err);
      let errorMessage = `Failed to process attendance for ${nameToUse || `ID: ${userId}`}.`;
      if (err.response && err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
        errorMessage = 
 (err.response.data as ErrorResponseDTO).message;
      } else if (err.response && err.response.data && typeof err.response.data === 'string') {
          errorMessage = err.response.data;
      } else if (err.response && err.response.status === 404) {
          errorMessage = "Attendance failed: User not found. Please verify the ID.";
      }
      toast.error(errorMessage);
      setGlobalQrScanError(errorMessage);
      setLastScannedUser(null);
    }
  }, []);

  const handleQrScanSuccess = useCallback(async (decodedText: string) => {
    const userIdNum = parseInt(decodedText);
    if (isNaN(userIdNum)) {
      toast.error(`Invalid QR Code: 
 Scanned value '${decodedText}' is not a valid User ID.`);
      setGlobalQrScanError('Invalid QR Code: Non-numeric ID.');
      setLastScannedUser(null);
      return;
    }
    await handleScanCheckInOrOut(userIdNum);
  }, [handleScanCheckInOrOut]);

  const handleQrScanError = useCallback((errorMessage: string) => {
    setGlobalQrScanError(errorMessage);
  }, []);
  // --- End Scanner Logic ---


  // Determine the visual state of the sidebar
  // It's "visually expanded" if it's explicitly open OR if it's desktop and hovering.
  const isSidebarVisuallyExpanded = isSidebarOpen || (isHovering && !isMobileView); // REINSTATED isHovering
 
  // Calculate main content margin based on visual state
  const mainContentMl = isMobileView ? '0px' : (isSidebarVisuallyExpanded ? 'var(--sidebar-expanded-width)' : 'var(--sidebar-collapsed-width)');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-700">
        <p className="text-lg">Loading application...</p>
      </div>
    );
  }

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Attendance', path: '/attendance', icon: CalendarCheck },
    { label: 'Payments', path: '/payments', icon: DollarSign }, // NEW MENU ITEM
    { label: 'Members', path: '/users', icon: Users },
    { label: 'Trainers', path: '/trainers', icon: UserCog },
    { label: 'Plans', path: '/plans', icon: Package },
    { label: 'Reports', path: '/reports', icon: BarChart4 },
  ];


  return (
    <div className="flex min-h-screen bg-gray-100">
      {isAuthenticated && (
        <>
          {/* Top Bar (fixed position, content shifts with sidebar) */}
          <header className={`bg-white 
           shadow-sm p-4 border-b border-gray-200 flex items-center fixed w-full top-0 z-30 transition-all duration-300 ease-in-out`}
            style={{ left: mainContentMl, width: `calc(100% - ${mainContentMl})` }}
          >
            {/* Hamburger for Mobile only */}
            {isMobileView && (
              <button onClick={handleToggleSidebar} className="text-gray-800 focus:outline-none mr-4">
        
               <Menu className="h-6 w-6" /> {/* Hamburger icon for mobile always */}
              </button>
            )}

            {/* "Gym Central" title on mobile, "Welcome, user!" on desktop */}
            {isMobileView ? (
              <span className="text-xl font-extrabold text-teal-600">Gym 
               Central</span>
            ) : (
              // On Desktop, display Welcome message and global QR toggle
              <div className="flex items-center ml-auto">
                {/* Global QR Scanner Toggle Switch */}
                <label htmlFor="global-qr-scanner-toggle" className="flex items-center cursor-pointer mr-4">
 
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="global-qr-scanner-toggle"
                
                      className="sr-only"
                      checked={showGlobalQrScanner}
                      onChange={() => setShowGlobalQrScanner(!showGlobalQrScanner)}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors 
                 duration-200 ${showGlobalQrScanner ? 'bg-indigo-600' : 'bg-gray-400'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ${showGlobalQrScanner ? 'translate-x-full' : 'translate-x-0'}`}></div>
                  </div>
                  <div className="ml-3 text-gray-700 font-medium flex items-center">
                 
                   <ScanLine className="h-5 w-5 mr-1" /> QR Scan
                  </div>
                </label>
                {user && (
                  <span className="text-lg font-semibold text-gray-800">Welcome, {user.username}!</span>
               
                 )}
              </div>
            )}
          </header>

          {/* Sidebar */}
          <aside
            ref={sidebarRef}
            className={`app-sidebar bg-gray-800 text-white flex flex-col shadow-lg z-20 transition-all duration-300 ease-in-out h-full
     
          ${isSidebarVisuallyExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'} /* Controls width & text opacity */
              ${isMobileView && !isSidebarOpen ? '-translate-x-full' : ''} /* Mobile: slide in/out based on isSidebarOpen */
            `}
            // Desktop hover behavior: only apply if not already explicitly open via click
            onMouseEnter={() => 
               !isMobileView && setIsHovering(true)} // REINSTATED onMouseEnter
            onMouseLeave={() => !isMobileView && setIsHovering(false)} // REINSTATED onMouseLeave
          >
            {/* Sidebar Header (Gym Central Text / Hamburger Icon) */}
            <div className={`p-4 text-3xl font-extrabold border-b border-gray-700 text-teal-400
              flex items-center justify-between overflow-hidden relative h-16
      
               `}>
              {/* Conditional rendering for "Gym Central" or Hamburger Icon */}
              {isSidebarVisuallyExpanded ? (
                <span className="whitespace-nowrap transition-opacity duration-100 ease-in-out">Gym Central</span>
              ) : (
                
                // Display Hamburger Icon when collapsed on desktop
                <span className="w-full flex justify-center transition-opacity duration-100 ease-in-out">
                    <Menu size={28} className="lucide lucide-menu" /> {/* Larger hamburger */}
                </span>
              )}
           
            
              {/* Removed the desktop toggle button here (ChevronLeft) */}
              {/* It was previously here, but its functionality is now tied to the sidebar state directly */}
            </div>

            {/* Navigation Links */}
            <nav className="flex-grow py-4">
  
             <ul className="space-y-1">
                {menuItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
      
                      onClick={() => {
                        // On mobile, clicking a menu item closes the sidebar
                        if (isMobileView) {
                          setIsSidebarOpen(false);
                        } else {
                          // FIX: On desktop, we navigate but maintain the current sticky state.
                          // We reset hovering as interaction is intentional, allowing hover re-expansion.
                          setIsHovering(false); 
                        }
                      }}
                      className={`
                   
     group flex items-center w-full py-3 px-4 rounded-md text-gray-300
                        hover:bg-gray-700 hover:text-white transition-colors duration-200 ease-in-out
                        ${location.pathname.startsWith(item.path) ? 'bg-gray-700 text-white' : ''}
                      `}
       
                      >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span
                        // FIX: Simplified the span classes to rely purely on CSS for transition max-width/margin
                        className={`ml-3 whitespace-nowrap transition-opacity duration-300 ease-in-out
                          ${isSidebarVisuallyExpanded ? 'opacity-100' : 'opacity-0'}
                        `}
                      >
                        {item.label}
  
                      </span>
                      {/* Tooltip for collapsed desktop state */}
                      {!isMobileView && !isSidebarVisuallyExpanded && (
                        
                        <span className="tooltip absolute left-full ml-4 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                          {item.label}
                        </span>
                      )}
         
            </Link>
                  </li>
                ))}         
              </ul>
            </nav>

            {/* Logout Button */}
   
          <div className="p-4 border-t border-gray-700 text-sm">
              <button
                onClick={logout}
                className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition-colors duration-200 ease-in-out"
              >
            
     <span className={`${isSidebarVisuallyExpanded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100 ease-in-out`}>Logout</span>
              </button>
            </div>
          </aside>

          {/* Overlay for mobile */}
          {isMobileView && isSidebarOpen && (
            <div
          
     className="fixed inset-0 bg-black bg-opacity-50 z-10"
              onClick={() => setIsSidebarOpen(false)}
            ></div>
          )}

          {/* Main content area */}
          <div className={`flex-grow flex flex-col transition-all duration-300 ease-in-out`}
            style={{ marginLeft: mainContentMl, marginTop: isMobileView ? '64px' : '0px' }}
 
          >
            <main className="flex-grow p-6 overflow-auto" style={{ paddingTop: 'var(--topbar-height)' }}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

         
         {/* Protected Routes */}
                <Route path="/dashboard" element={<PrivateRoute><DashboardPage lastScannedUser={lastScannedUser} lastAttendanceRecord={lastAttendanceRecord} /></PrivateRoute>} />
                <Route path="/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
                <Route path="/trainers" element={<PrivateRoute><TrainersPage /></PrivateRoute>} />
                <Route path="/plans" element={<PrivateRoute><MembershipPlansPage /></PrivateRoute>} />
      
            <Route path="/attendance" element={<PrivateRoute><AttendancePage /></PrivateRoute>} />
                <Route path="/payments" element={<PrivateRoute><PaymentsPage /></PrivateRoute>} />
                <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} /> {/* NEW ROUTE */}

                {/* Fallback for undefined routes */}
                <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
              
 </Routes>
            </main>

            {/* Global Draggable QR Code Scanner Window */}
            {showGlobalQrScanner && !isMobileView && ( // Only show draggable window on desktop
                <DraggableScannerWindow
                    initialX={scannerWindowPosition.x}
        
             initialY={scannerWindowPosition.y}
                    onClose={() => setShowGlobalQrScanner(false)}
                    showScanner={showGlobalQrScanner}
                    lastScannedUser={lastScannedUser}
                    lastAttendanceRecord={lastAttendanceRecord}
    
                 handleQrScanSuccess={handleQrScanSuccess}
                    handleQrScanError={handleQrScanError}
                    globalQrScanError={globalQrScanError}
                />
            )}
            {/* End 
 Global Draggable QR Code Scanner Window */}

          </div>
        </>
      )}
      {!isAuthenticated && (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}

      <ToastContainer
   
     position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default App;
