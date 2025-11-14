// src/pages/ReportsPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '../api/axiosConfig';
import { format } from 'date-fns'; // FIX 1: Missing import for date formatting
import { BarChart4 } from 'lucide-react'; // FIX 2: Missing icon import

// --- Interfaces to define the report data types ---
interface ReportField {
    key: string; // The backend JSON key (e.g., 'name', 'joiningDate', 'amount')
    label: string; // The human-readable column header (e.g., 'Member Name', 'Joining Date')
    type: 'string' | 'number' | 'date'; // Data type for filtering/display logic
}

interface ReportDefinition {
    type: string; // 'users', 'payments', 'attendance' (Used as key and label access)
    fields: ReportField[];
    endpoint: string; // Backend endpoint fragment to fetch raw data
}

// Map of all available reports (Data source definitions)
const ReportDefinitions: Record<string, ReportDefinition> = {
    users: {
        type: 'Users Report', // FIX 3: Using a proper display label here
        fields: [
            { key: 'userId', label: 'User ID', type: 'number' },
            { key: 'name', label: 'Member Name', type: 'string' },
            { key: 'contactNumber', label: 'Contact', type: 'string' },
            { key: 'membershipStatus', label: 'Status', type: 'string' },
            { key: 'joiningDate', label: 'Joining Date', type: 'date' },
            { key: 'currentPlanName', label: 'Current Plan', type: 'string' },
            { key: 'currentPlanEndDate', label: 'Expiry Date', type: 'date' },
        ],
        endpoint: '/users',
    },
    payments: {
        type: 'Payments Report', // FIX 3: Using a proper display label here
        fields: [
            { key: 'paymentId', label: 'Payment ID', type: 'number' },
            { key: 'userName', label: 'Member Name', type: 'string' },
            { key: 'amount', label: 'Amount Paid (INR)', type: 'number' },
            { key: 'dueAmount', label: 'Due (INR)', type: 'number' },
            { key: 'paymentMethod', label: 'Method', type: 'string' },
            { key: 'paymentDate', label: 'Date', type: 'date' },
            { key: 'membershipSession', label: 'Session', type: 'string' },
            { key: 'transactionId', label: 'Transaction ID', type: 'string' },
        ],
        endpoint: '/payments',
    },
    // Attendance data is complex. We will use the all attendance records endpoint.
    attendance: {
        type: 'Attendance Report', // FIX 3: Using a proper display label here
        fields: [
            { key: 'attendanceId', label: 'Record ID', type: 'number' },
            { key: 'userName', label: 'Member Name', type: 'string' },
            { key: 'checkInTime', label: 'Check-In', type: 'date' },
            { key: 'checkOutTime', label: 'Check-Out', type: 'date' },
            { key: 'timeSpentMinutes', label: 'Time Spent (min)', type: 'number' },
        ],
        endpoint: '/attendance/all',
    },
};
// --- END Report Definitions ---

// Helper function to convert data to CSV format
const convertToCSV = (data: any[], selectedKeys: string[]) => {
    if (!data || data.length === 0 || selectedKeys.length === 0) return '';
    
    // Header row (labels)
    const header = selectedKeys.map(key => {
        // Look up the label from definitions based on the key
        for (const defKey in ReportDefinitions) {
            const field = ReportDefinitions[defKey].fields.find(f => f.key === key);
            // Ensure we use the label from the active report type's definition for maximum accuracy
            if (field) return `"${field.label}"`;
        }
        return `"${key}"`; // Fallback
    }).join(',');

    // Data rows
    const rows = data.map(row => {
        return selectedKeys.map(key => {
            let value = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
            // Escape double quotes and surround with quotes
            return `"${value.replace(/"/g, '""')}"`;
        }).join(',');
    }).join('\n');

    return header + '\n' + rows;
};


const ReportsPage: React.FC = () => {
    const [selectedReportType, setSelectedReportType] = useState<string>('users');
    const [activeReport, setActiveReport] = useState<ReportDefinition>(ReportDefinitions['users']);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(ReportDefinitions['users'].fields.map(f => f.key));
    
    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [totalElements, setTotalElements] = useState<number>(0);
    const recordsPerPage = 10; // Fixed pagination size for UI display

    useEffect(() => {
        const report = ReportDefinitions[selectedReportType] || ReportDefinitions['users'];
        setActiveReport(report);
        setSelectedColumns(report.fields.map(f => f.key));
        setCurrentPage(0);
        setReportData([]);
        setTotalPages(0);
        setTotalElements(0);
    }, [selectedReportType]);

    // This effect runs whenever currentPage changes (including after type change resets it to 0)
    useEffect(() => {
        if (activeReport && currentPage >= 0) {
            fetchReportData();
        }
    }, [currentPage, activeReport]);

    const fetchReportData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get(activeReport.endpoint, {
                params: {
                    page: currentPage,
                    size: recordsPerPage,
                    sort: 'userId,asc', // Default sort, adjust as needed per endpoint
                },
            });

            // Handle Page or raw List responses correctly
            const responseData = response.data.content || response.data; 
            setReportData(responseData);
            setTotalElements(response.data.totalElements || responseData.length);
            setTotalPages(response.data.totalPages || 1);

        } catch (err) {
            console.error(`Failed to fetch ${activeReport.type} report:`, err);
            toast.error(`Failed to fetch report for ${activeReport.type}.`);
        } finally {
            setLoading(false);
        }
    }, [currentPage, activeReport]);


    const handleColumnToggle = (key: string) => {
        setSelectedColumns(prev => 
            prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
        );
    };

    const handlePrintCSV = () => {
        if (reportData.length === 0) {
            toast.info("No data to export.");
            return;
        }

        // Export the current page data.
        const csv = convertToCSV(reportData, selectedColumns);
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) { 
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            // Use the activeReport.type for the filename
            link.setAttribute("download", `${activeReport.type.toLowerCase().replace(/\s/g, '_')}_report_${format(new Date(), 'yyyyMMdd')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("CSV export started.");
        }
    };

    const formatValue = (key: string, value: any) => {
        if (value === null || value === undefined) return 'N/A';
        const field = activeReport.fields.find(f => f.key === key);
        if (!field) return String(value);

        // FIX: Define fields that should NOT have the thousand separator (e.g., IDs, Contact numbers)
        // This check ensures we always return a plain string for these values.
        const noSeparatorFields = ['userId', 'paymentId', 'attendanceId', 'contactNumber', 'timeSpentMinutes'];
        
        // If the key is one of the designated non-separator fields, return the plain string value immediately.
        if (noSeparatorFields.includes(key)) {
            // Note: We use String(value) to ensure non-string types are safely converted.
            return String(value); 
        }

        switch (field.type) {
            case 'date':
                try {
                    // Format date/datetime strings
                    return format(new Date(value), 'yyyy-MM-dd HH:mm:ss');
                } catch {
                    return String(value);
                }
            case 'number':
                // This path is now ONLY for currency fields like 'amount' and 'dueAmount'
                // We use toLocaleString here to format currency/large numbers with a separator.
                return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 0 }); 
            default:
                return String(value);
        }
    }


    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <BarChart4 className="w-8 h-8 mr-3" /> Custom Data Reports
            </h1>
            
            <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Report Builder</h2>
                
                {/* Report Type Selector */}
                <div className="mb-4">
                    <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-1">
                        Select Report Type:
                    </label>
                    <select
                        id="reportType"
                        value={selectedReportType}
                        onChange={(e) => setSelectedReportType(e.target.value)}
                        className="mt-1 block w-full md:w-1/3 border border-gray-300 rounded-md shadow-sm p-2 bg-white"
                    >
                        {/* Use object keys for value and object type for label */}
                        {Object.keys(ReportDefinitions).map(key => (
                            <option key={key} value={key}>{ReportDefinitions[key].type}</option>
                        ))}
                    </select>
                </div>

                {/* Column Visibility Selector (Advanced Analytics) */}
                <div className="mb-6 border p-4 rounded-md bg-white">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Column Display Options</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {activeReport.fields.map(field => (
                            <label key={field.key} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedColumns.includes(field.key)}
                                    onChange={() => handleColumnToggle(field.key)}
                                    className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                                />
                                <span className="text-sm text-gray-700">{field.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Search/Filter Bar (Placeholder - Implement Advanced Filtering Here) */}
                <div className="flex justify-between items-center space-x-4">
                    <input
                        type="text"
                        placeholder={`Filter ${activeReport.type} by keyword... (Feature TBD)`}
                        className="flex-grow border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 cursor-not-allowed"
                        disabled
                    />
                    
                    {/* The fetch is driven by page changes, so the "Search" button acts as a manual trigger for the current query/page */}
                    <button
                        onClick={() => fetchReportData()}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 flex-shrink-0"
                    >
                        {loading ? 'Searching...' : 'Run Report'}
                    </button>
                    <button
                        onClick={handlePrintCSV}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 flex items-center space-x-2 flex-shrink-0"
                        title="Export current page to CSV"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.5V20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5.5"/><polyline points="15 8 12 11 9 8"/><line x1="12" y1="11" x2="12" y2="3"/></svg>
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Report Results Table */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">Report Results ({activeReport.type})</h2>
            
            {loading && reportData.length === 0 ? (
                <p className="text-center text-gray-600">Loading report data...</p>
            ) : (
                <div className="overflow-x-auto">
                    {reportData.length === 0 ? (
                        <p className="text-center text-gray-500">No records found for the current filter/page.</p>
                    ) : (
                        <>
                            <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg table-auto">
                                <thead>
                                    <tr className="bg-gray-100">
                                        {selectedColumns.map(key => {
                                            const field = activeReport.fields.find(f => f.key === key);
                                            return (
                                                <th key={key} className="py-3 px-4 border-b text-left text-gray-600 font-semibold whitespace-nowrap">
                                                    {field ? field.label : key}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map((row, index) => (
                                        <tr key={index} className="border-b hover:bg-gray-50">
                                            {selectedColumns.map(key => (
                                                <td key={key} className="py-3 px-4 text-gray-700 text-sm">
                                                    {formatValue(key, row[key])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-6 p-4 bg-gray-50 rounded-lg shadow-inner">
                                    <span className="text-gray-700 text-sm">
                                        Page {currentPage + 1} of {totalPages} ({totalElements} records total)
                                    </span>
                                    <div className="space-x-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                            disabled={currentPage === 0 || loading}
                                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l-md disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                                            disabled={currentPage === totalPages - 1 || loading}
                                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-r-md disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReportsPage;