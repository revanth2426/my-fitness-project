// src/components/DraggableScannerWindow.tsx
import React, { useState, useRef, useEffect, type FunctionComponent } from 'react';
import QrCodeScanner from './QrCodeScanner'; // Ensure correct path to QrCodeScanner

interface DraggableScannerWindowProps {
  initialX: number;
  initialY: number;
  onClose: () => void;
  showScanner: boolean; // Controls whether the QrCodeScanner is active
  lastScannedUser: { userId: number; name: string } | null;
  lastAttendanceRecord: { checkInTime: string; checkOutTime?: string; timeSpentMinutes?: number } | null;
  handleQrScanSuccess: (decodedText: string) => void;
  handleQrScanError: (errorMessage: string) => void;
  globalQrScanError: string | null;
}

const DraggableScannerWindow: FunctionComponent<DraggableScannerWindowProps> = ({
  initialX,
  initialY,
  onClose,
  showScanner,
  lastScannedUser,
  lastAttendanceRecord,
  handleQrScanSuccess,
  handleQrScanError,
  globalQrScanError,
}) => {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only allow drag from the header area
    if (windowRef.current && (e.target as HTMLElement).classList.contains('draggable-header') || (e.target as HTMLElement).closest('.draggable-header')) {
      setIsDragging(true);
      offset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      // Calculate new position
      let newX = e.clientX - offset.current.x;
      let newY = e.clientY - offset.current.y;

      // Keep window within viewport bounds (optional, but good practice)
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const windowWidth = windowRef.current?.offsetWidth || 0;
      const windowHeight = windowRef.current?.offsetHeight || 0;

      newX = Math.max(0, Math.min(newX, viewportWidth - windowWidth));
      newY = Math.max(0, Math.min(newY, viewportHeight - windowHeight));
      
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Helper function to format time spent (copied from DashboardPage for self-containment)
  const formatTimeSpent = (minutes?: number) => {
    if (minutes === undefined || minutes === null) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
  };

  // Calculate dynamic height for scan result/error area to help min-height
  const dynamicContentHeight = lastScannedUser ? (lastAttendanceRecord?.checkOutTime ? 100 : 70) : (globalQrScanError ? 50 : 30); // Rough pixel estimates

  return (
    <div
      ref={windowRef}
      className="draggable-window fixed bg-white rounded-lg shadow-xl z-50 flex flex-col"
      style={{ left: position.x, top: position.y, width: '300px', minHeight: `calc(30px + 20px + 250px + 16px + ${dynamicContentHeight}px)` }} // Header height + padding + scanner height + vertical margin + dynamic content height
    >
      {/* Draggable Header */}
      <div
        className="draggable-header flex justify-between items-center bg-gray-800 text-white p-2 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
      >
        <h4 className="font-semibold text-lg">Live QR Scan</h4>
        <button onClick={onClose} className="text-gray-300 hover:text-white focus:outline-none p-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      {/* Scanner Content */}
      <div className="p-4 flex-grow flex flex-col items-center justify-center">
        {/* The QrCodeScanner component */}
        <div className="w-full max-w-[250px] mx-auto aspect-square flex items-center justify-center overflow-hidden rounded-md bg-gray-900">
            <QrCodeScanner
                onScanSuccess={handleQrScanSuccess}
                onScanError={handleQrScanError}
                qrCodeError={null} // Errors shown via toast, not in this small display
                showScanner={showScanner}
            />
        </div>

        {/* Last Scan Result Display */}
        {lastScannedUser ? (
          <div className="mt-4 p-2 text-sm bg-blue-100 border border-blue-200 text-blue-800 rounded-md w-full">
            <p><span className="font-semibold">User:</span> {lastScannedUser.name} (ID: {lastScannedUser.userId})</p>
            {lastAttendanceRecord && (
              <>
                <p><span className="font-semibold">Action:</span> {lastAttendanceRecord.checkOutTime ? 'Checked Out' : 'Checked In'}</p>
                <p><span className="font-semibold">Time:</span> {new Date(lastAttendanceRecord.checkInTime).toLocaleTimeString()}</p>
                {lastAttendanceRecord.timeSpentMinutes !== undefined && lastAttendanceRecord.timeSpentMinutes !== null &&
                  <p><span className="font-semibold">Spent:</span> {formatTimeSpent(lastAttendanceRecord.timeSpentMinutes)}</p>
                }
              </>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-center mt-4 text-sm">Waiting for first scan...</p>
        )}
      </div>
    </div>
  );
};

export default DraggableScannerWindow;