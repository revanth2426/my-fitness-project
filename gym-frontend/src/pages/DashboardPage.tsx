// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosConfig';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
// QrCodeScanner import removed from here as it's now only in DraggableScannerWindow
// import QrCodeScanner from '../components/QrCodeScanner'; 

// Define interfaces for data structures
interface DashboardSummary {
  totalActiveMembers: number;
  totalTrainers: number;
}

// For daily attendance data, mapping date string to count
interface DailyAttendance {
  [date: string]: number;
}

// UPDATED: Interface for ExpiringMembership from Backend (ExpiringMembershipDTO)
interface ExpiringMembershipDisplay {
  userId?: string;
  userName: string;
  planId?: number;
  planName: string;
  endDate: string;
}

// --- NEW PROPS INTERFACE FOR DASHBOARD PAGE ---
// DashboardPage no longer displays the QR scanner itself, so remove its props
interface DashboardPageProps {
  // showQrScanner: boolean; // Removed
  lastScannedUser: { userId: number; name: string } | null; // Keep last scanned user to display as general info
  lastAttendanceRecord: { checkInTime: string; checkOutTime?: string; timeSpentMinutes?: number } | null; // Keep for general info
  // handleQrScanSuccess: (decodedText: string) => void; // Removed
  // handleQrScanError: (errorMessage: string) => void; // Removed
  // globalQrScanError: string | null; // Removed
}
// --- END NEW PROPS INTERFACE ---

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF0054'];
// Removed showQrScanner, handleQrScanSuccess, handleQrScanError, globalQrScanError from destructuring
const DashboardPage: React.FC<DashboardPageProps> = ({ lastScannedUser, lastAttendanceRecord }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [planDistributionData, setPlanDistributionData] = useState<any[]>([]);
  const [attendanceChartData, setAttendanceChartData] = useState<any[]>([]);
  const [expiringMemberships, setExpiringMemberships] = useState<ExpiringMembershipDisplay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch Summary Data
        const summaryRes = await axiosInstance.get<DashboardSummary>('/dashboard/summary');
        setSummary(summaryRes.data);

        // Fetch Plan Distribution (now based on Users' current plans)
        const planDistRes = await axiosInstance.get<{ [key: string]: number }>('/dashboard/plan-distribution');

        const formattedPlanData = Object.entries(planDistRes.data).map(([name, value]) => ({ name, value }));
        setPlanDistributionData(formattedPlanData);

        // Fetch Daily Attendance for last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 6);

        const formatDateForApi = (date: Date) => format(date, 'yyyy-MM-dd');
        const attendanceRes = await axiosInstance.get<DailyAttendance>(`/dashboard/daily-attendance-chart`, 
{
          params: {
            startDate: formatDateForApi(startDate),
            endDate: formatDateForApi(endDate),
          },
        });
        const dailyDataMap: { [key: string]: number } = {};
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          dailyDataMap[formatDateForApi(d)] = 0;
        }
        Object.entries(attendanceRes.data).forEach(([date, count]) => {
          dailyDataMap[date] = count;
        });
        const formattedAttendanceData = Object.entries(dailyDataMap)
          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
          .map(([date, count]) => ({ date, count }));
        setAttendanceChartData(formattedAttendanceData);


        // Fetch Expiring Memberships (now based on Users' current plans)
        const expiringRes = await axiosInstance.get<ExpiringMembershipDisplay[]>('/dashboard/expiring-memberships', {
          params: { days: 7 },
        });
        setExpiringMemberships(expiringRes.data);

      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Helper function to format time spent
  const formatTimeSpent = (minutes?: number) => {
    if (minutes === undefined || minutes === null) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
  };


  if (loading) {
    return <div className="p-6 text-center text-gray-600">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-100 p-6 rounded-lg shadow flex flex-col items-center justify-center">
          <h3 className="text-xl font-semibold text-blue-800">Total Active Members</h3>
          <p className="text-5xl font-extrabold text-blue-900 mt-2">{summary?.totalActiveMembers ?? 0}</p>
        </div>
        <div className="bg-green-100 p-6 rounded-lg 
shadow flex flex-col items-center justify-center">
          <h3 className="text-xl font-semibold text-green-800">Total Trainers</h3>
          <p className="text-5xl font-extrabold text-green-900 mt-2">{summary?.totalTrainers ?? 0}</p>
        </div>
        <div className="bg-yellow-100 p-6 rounded-lg shadow flex flex-col items-center justify-center">
          <h3 className="text-xl font-semibold text-yellow-800">Memberships Expiring (7 Days)</h3>
          <p className="text-5xl font-extrabold text-yellow-900 mt-2">{expiringMemberships.length}</p>
        </div>
      </div>

      {/* Main content grid for charts (QR scanner block removed entirely) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"> {/* Changed to lg:grid-cols-2 as scanner block is removed */}
        {/* Daily Attendance Last 7 Days Chart (now spans 1 or 2 columns based on screen size, no longer needs to avoid scanner) */}
        <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-1"> {/* Adjusted to lg:col-span-1 or remove if you want it to fill available space */}
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Daily Attendance Last 7 Days</h3>
          {attendanceChartData.length > 0 ?
          (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} name="Check-ins" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center">No attendance data for 
the last 7 days.</p>
          )}
        </div>

        {/* Membership Plan Distribution Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-1">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Membership Plan Distribution</h3>
          {planDistributionData.length > 0 ?
          (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {planDistributionData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center">No plan distribution data available.</p>
          )}
        </div>

        {/* Optional: Display Last Scan Result as a separate, smaller info block if needed */}
        {/* If you want to show the last scan info on dashboard without the scanner being there */}
        {(lastScannedUser || lastAttendanceRecord) && (
          <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2"> {/* Span 2 columns, or adjust as needed */}
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Last Processed QR Scan</h3>
            {lastScannedUser ? (
              <div className="mt-2 p-3 bg-blue-100 border border-blue-200 text-blue-800 rounded-md">
                <p><span className="font-semibold">User:</span> {lastScannedUser.name} (ID: {lastScannedUser.userId})</p>
                {lastAttendanceRecord && (
                  <>
                    <p>Action: {lastAttendanceRecord.checkOutTime ? 'Checked Out' : 'Checked In'}</p>
                    <p>Time: {new Date(lastAttendanceRecord.checkInTime).toLocaleTimeString()}</p>
                    {lastAttendanceRecord.timeSpentMinutes !== undefined && lastAttendanceRecord.timeSpentMinutes !== null &&
                      <p>Time Spent: {formatTimeSpent(lastAttendanceRecord.timeSpentMinutes)}</p>
                    }
                  </>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center">No recent QR scan data processed on this dashboard.</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Memberships Expiring Soon</h3>
        {expiringMemberships.length > 0 ?
        (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left text-gray-600 font-semibold">Member Name</th>
                  
                  <th className="py-2 px-4 border-b text-left text-gray-600 font-semibold">Plan Name</th>
                  <th className="py-2 px-4 border-b text-left text-gray-600 font-semibold">End Date</th>
                </tr>
              </thead>
              <tbody>
                {expiringMemberships.map((membership) => (
                  <tr key={membership.userId || membership.planId} className="hover:bg-gray-50"> {/* Use a combination for key if assignmentId is gone */}
                    <td className="py-2 px-4 border-b text-gray-700">{membership.userName}</td>
                    <td className="py-2 px-4 border-b text-gray-700">{membership.planName}</td>
                    <td className="py-2 px-4 border-b text-gray-700">{membership.endDate}</td>
 
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center">No memberships expiring in the next 7 days.</p>
  
        )}
      </div>
    </div>
  );
};
export default DashboardPage;