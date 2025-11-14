// src/pages/PaymentsPage.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import axiosInstance from '../api/axiosConfig';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import PaymentForm from '../components/PaymentForm';
import PayDueForm from '../components/PayDueForm';

import { ChevronDown, ChevronUp, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
// NEW: Import the receipt generation function
import { generatePaymentReceiptPdf } from '../utils/receiptGenerator';

// Define interfaces to match Backend DTOs
interface PaymentDisplay {
  paymentId: number;
  userId: number;
  userName: string;
  amount: number;
  dueAmount: number;
  totalMembershipFee: number;
  membershipSession: string | null;
  paymentDate: string; // This is typically a string like "YYYY-MM-DD"
  paymentMethod: string;
  paymentMethodDetail: string | null;
  membershipPlanId: number | null;
  membershipPlanName: string | null;
  transactionId?: string | null;
  notes?: string | null;
}

interface PaginatedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: { empty: boolean; sorted: boolean; unsorted: boolean; };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalPages: number;
  totalElements: number;
  first: boolean;
  size: number;
  number: number;
  sort: { empty: boolean; sorted: boolean; unsorted: boolean; };
  numberOfElements: number;
  empty: boolean;
}

interface PaymentAnalytics {
  totalAmountCollected: number;
  totalPaymentsCount: number;
  totalDueAmount: number;
  totalExpectedAmount: number;
  cashCollected: number;
  cardCollected: number;
  onlineCollected: number;
  amountByPaymentMethod: { [key: string]: number };
  countByMethod: { [key: string]: number };
  amountByMembershipPlan: { [key: string]: number };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF0054'];

const PaymentsPage: React.FC = () => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPayDueForm, setShowPayDueForm] = useState(false);
  const [selectedDuePayment, setSelectedDuePayment] = useState<PaymentDisplay | null>(null);

  const [payments, setPayments] = useState<PaymentDisplay[]>([]);
  const [outstandingDuePayments, setOutstandingDuePayments] = useState<PaymentDisplay[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingOutstandingDues, setLoadingOutstandingDues] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [outstandingDuesError, setOutstandingDuesError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [showAnalyticsSection, setShowAnalyticsSection] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [recordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [analyticsStartDate, setAnalyticsStartDate] = useState(format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'));
  const [analyticsEndDate, setAnalyticsEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const gymInfo = {
    name: "SR FITNESS GYM", // ALL CAPS for receipt header
    address: "123 Gym Road, Fitness City, State 12345",
    phone: "+91 98765 43210",
    email: "info@srfitness.com"
  };


  const fetchPayments = useCallback(async () => {
    try {
      setLoadingPayments(true);
      const response = await axiosInstance.get<PaginatedResponse<PaymentDisplay>>('/payments', {
        params: {
          page: currentPage,
          size: recordsPerPage,
          sort: 'paymentDate,desc',
        },
      });
      setPayments(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
      setPaymentsError(null);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err: any) {
      console.error('Failed to fetch payments:', err);
      setPaymentsError('Failed to load payment records. Please ensure backend is running.');
    } finally {
      setLoadingPayments(false);
    }
  }, [currentPage, recordsPerPage]);

  const fetchOutstandingDuePayments = useCallback(async () => {
    try {
      setLoadingOutstandingDues(true);
      const response = await axiosInstance.get<PaymentDisplay[]>('/payments/outstanding-dues');
      setOutstandingDuePayments(response.data);
      setOutstandingDuesError(null);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err: any) {
      console.error('Failed to fetch outstanding due payments:', err);
      setOutstandingDuesError('Failed to load outstanding due payments. Please try again.');
    } finally {
      setLoadingOutstandingDues(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoadingAnalytics(true);
      const response = await axiosInstance.get<PaymentAnalytics>('/payments/analytics', {
        params: {
          startDate: analyticsStartDate,
          endDate: analyticsEndDate,
        },
      });
      setAnalytics(response.data);
      setAnalyticsError(null);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err: any) {
      console.error('Failed to fetch payment analytics:', err);
      setAnalyticsError('Failed to load payment analytics. Check date range or backend.');
    } finally {
      setLoadingAnalytics(false);
    }
  }, [analyticsStartDate, analyticsEndDate]);

  useEffect(() => {
    fetchPayments();
    fetchOutstandingDuePayments();
  }, [fetchPayments, fetchOutstandingDuePayments]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handlePaymentAdded = () => {
    toast.success('Payment added successfully!');
    fetchPayments();
    fetchOutstandingDuePayments();
    fetchAnalytics();
    setShowPaymentForm(false);
    setShowAnalyticsSection(true);
  };

  const handlePaymentSuccessAndReceipt = (payment: PaymentDisplay) => {
    handlePaymentAdded();
    generatePaymentReceiptPdf(payment, gymInfo); // Call the imported utility function
    toast.info("Payment recorded. Receipt generated!", { autoClose: 5000 });
  };

  const handleAddPaymentClick = () => {
    setShowPaymentForm(true);
    setShowPayDueForm(false);
    setShowAnalyticsSection(false);
  };
  const handleCancelPaymentForm = () => {
    setShowPaymentForm(false);
    setShowAnalyticsSection(true);
  };
  const handleDeletePayment = async (paymentId: number) => {
    if (window.confirm(`Are you sure you want to delete payment record ID: ${paymentId}? This action cannot be undone.`)) {
      setLoadingPayments(true);
      try {
        await axiosInstance.delete(`/payments/${paymentId}`);
        toast.success(`Payment record ${paymentId} deleted successfully!`);
        fetchPayments();
        fetchOutstandingDuePayments();
        fetchAnalytics();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      catch (err: any) {
        console.error('Failed to delete payment record:', err);
        toast.error('Failed to delete payment record. It might be in use or an internal error occurred.');
      } finally {
        setLoadingPayments(false);
      }
    }
  };
  const handlePayDueClick = (payment: PaymentDisplay) => {
    setSelectedDuePayment(payment);
    setShowPayDueForm(true);
    setShowPaymentForm(false);
    setShowAnalyticsSection(false);
  };
  const handleDuePaymentSubmitted = () => {
    toast.success('Due payment recorded successfully!');
    fetchPayments();
    fetchOutstandingDuePayments();
    fetchAnalytics();
    setShowPayDueForm(false);
    setSelectedDuePayment(null);
    setShowAnalyticsSection(true);
  };

  const handleCancelPayDueForm = () => {
    setShowPayDueForm(false);
    setSelectedDuePayment(null);
    setShowAnalyticsSection(true);
  };

  // The generatePdf function is now moved to src/utils/receiptGenerator.ts
  // So this `useCallback` here is no longer needed.
  // const generatePdf = useCallback((paymentData: PaymentDisplay, gymDetails: typeof gymInfo) => { /* ... */ }, [gymInfo]);


  const handleAnalyticsDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'startDate') {
      setAnalyticsStartDate(value);
    } else {
      setAnalyticsEndDate(value);
    }
  };

  const headers = [
    { label: 'Payment ID', width: 'w-[90px]' },
    { label: 'User ID', width: 'w-[90px]' },
    { label: 'User Name', width: 'w-[120px]' },
    { label: 'Amount Paid', width: 'w-[100px]' },
    { label: 'Total Fee', width: 'w-[100px]' },
    { label: 'Due', width: 'w-[80px]' },
    { label: 'Status', width: 'w-[80px]' },
    { label: 'Date', width: 'w-[120px]' },
    { label: 'Method', width: 'w-[100px]' },
    { label: 'Detail', width: 'w-[120px]' },
    { label: 'Plan (Session)', width: 'w-[180px]' },
    { label: 'Transaction ID', width: 'w-[150px]' },
    { label: 'Notes', width: 'w-[150px]' },
    { label: 'Actions', width: 'w-[100px]' },
  ];

  const outstandingDueHeaders = [
    { label: 'User ID', width: 'w-[90px]' },
    { label: 'User Name', width: 'w-[120px]' },
    { label: 'Plan (Session)', width: 'w-[180px]' },
    { label: 'Total Fee', width: 'w-[100px]' },
    { label: 'Due Amount', width: 'w-[100px]' },
    { label: 'Last Paid Date', width: 'w-[120px]' },
    { label: 'Actions', width: 'w-[100px]' },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Payments Management</h1>

      <button
        onClick={handleAddPaymentClick}
        className="mb-6 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
      >
        Add New Payment
      </button>

      {showPaymentForm && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
          <PaymentForm onPaymentAdded={handlePaymentAdded} onCancel={handleCancelPaymentForm} onPaymentSuccess={handlePaymentSuccessAndReceipt} />
        </div>
      )}

      {showPayDueForm && selectedDuePayment && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
          <PayDueForm
            originalPaymentId={selectedDuePayment.paymentId}
            userId={selectedDuePayment.userId}
            userName={selectedDuePayment.userName}
            currentDueAmount={selectedDuePayment.dueAmount}
            originalMembershipSession={selectedDuePayment.membershipSession}
            onPaymentSubmitted={handleDuePaymentSubmitted}
            onCancel={handleCancelPayDueForm}
          />
        </div>
      )}

      {/* Outstanding Due Payments Section */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">Outstanding Due Payments</h2>
      {outstandingDuesError && <p className="text-red-600 text-center mb-4">{outstandingDuesError}</p>}
      {loadingOutstandingDues ? (
        <p className="text-center text-gray-600">Loading outstanding dues...</p>
      ) : outstandingDuePayments.length === 0 ? (
        <p className="text-center text-gray-500">No outstanding due payments found.</p>
      ) : (
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
            <thead>
              <tr className="bg-red-100">
                {outstandingDueHeaders.map((header) => (
                  <th key={header.label} className={`py-3 px-4 border-b text-left text-red-800 font-semibold ${header.width}`}>
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outstandingDuePayments.map((payment) => (
                <tr key={payment.paymentId} className="border-b hover:bg-red-50">
                  <td className="py-3 px-4 text-gray-700 text-sm">{payment.userId}</td>
                  <td className="py-3 px-4 text-gray-700">{payment.userName}</td>
                  <td className="py-3 px-4 text-gray-700">{payment.membershipPlanName || 'N/A'} {payment.membershipSession ? `(${payment.membershipSession})` : ''}</td>
                  <td className="py-3 px-4 text-gray-700">INR {payment.totalMembershipFee !== null && payment.totalMembershipFee !== undefined ? payment.totalMembershipFee.toFixed(2) : 'N/A'}</td>
                  <td className="py-3 px-4 text-red-600 font-semibold">INR {payment.dueAmount.toFixed(2)}</td>
                  <td className="py-3 px-4 text-gray-700">{payment.paymentDate ? format(new Date(payment.paymentDate), 'yyyy-MM-dd') : 'N/A'}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handlePayDueClick(payment)}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-md flex-shrink-0 whitespace-nowrap"
                    >
                      Pay Due
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}


      {/* Analytics Dashboard - Conditionally rendered */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8 flex items-center justify-between cursor-pointer"
          onClick={() => setShowAnalyticsSection(!showAnalyticsSection)}>
        Payment Analytics
        {showAnalyticsSection ? <ChevronUp className="h-6 w-6 text-gray-600" /> : <ChevronDown className="h-6 w-6 text-gray-600" />}
      </h2>
      {analyticsError && <p className="text-red-600 text-center mb-4">{analyticsError}</p>}
      {showAnalyticsSection && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
          {/* Date Filters always span full width */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="analyticsStartDate" className="block text-sm font-medium text-gray-700">Start Date:</label>
              <input
                type="date"
                id="analyticsStartDate"
                name="startDate"
                value={analyticsStartDate}
                onChange={handleAnalyticsDateChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            <div>
              <label htmlFor="analyticsEndDate" className="block text-sm font-medium text-gray-700">End Date:</label>
              <input
                type="date"
                id="analyticsEndDate"
                name="endDate"
                value={analyticsEndDate}
                onChange={handleAnalyticsDateChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
          </div>

          {loadingAnalytics ? (
            <p className="text-center text-gray-600 col-span-full">Loading analytics...</p>
          ) : analytics ? (
            <>
              {/* Row 1: Main Summary Cards (Total Expected, Total Received, Total Due) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-100 p-4 rounded-lg flex flex-col items-center justify-center min-w-0">
                  <h3 className="text-lg font-semibold text-blue-800 whitespace-nowrap">Total Expected</h3>
                  <p className="text-4xl font-extrabold text-blue-900 mt-1 truncate">₹{analytics.totalExpectedAmount.toFixed(2)}</p>
                </div>
                <div className="bg-teal-100 p-4 rounded-lg flex flex-col items-center justify-center min-w-0">
                  <h3 className="text-lg font-semibold text-teal-800 whitespace-nowrap">Total Received</h3>
                  <p className="text-4xl font-extrabold text-teal-900 mt-1 truncate">₹{analytics.totalAmountCollected.toFixed(2)}</p>
                </div>
                <div className="bg-red-100 p-4 rounded-lg flex flex-col items-center justify-center min-w-0">
                  <h3 className="text-lg font-semibold text-red-800 whitespace-nowrap">Total Due</h3>
                  <p className="text-4xl font-extrabold text-red-900 mt-1 truncate">₹{analytics.totalDueAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* Row 2: Collected by Method Cards (Cash, Card, Online) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-purple-100 p-4 rounded-lg flex flex-col items-center justify-center min-w-0">
                  <h3 className="text-lg font-semibold text-purple-800 whitespace-nowrap">Cash Collected</h3>
                  <p className="text-3xl font-extrabold text-purple-900 mt-1 truncate">₹{analytics.cashCollected.toFixed(2)}</p>
                </div>
                <div className="bg-yellow-100 p-4 rounded-lg flex flex-col items-center justify-center min-w-0">
                  <h3 className="text-lg font-semibold text-yellow-800 whitespace-nowrap">Card Collected</h3>
                  <p className="text-3xl font-extrabold text-yellow-900 mt-1 truncate">₹{analytics.cardCollected.toFixed(2)}</p>
                </div>
                <div className="bg-indigo-100 p-4 rounded-lg flex flex-col items-center justify-center min-w-0">
                  <h3 className="text-lg font-semibold text-indigo-800 whitespace-nowrap">Online Collected</h3>
                  <p className="text-3xl font-extrabold text-indigo-900 mt-1 truncate">₹{analytics.onlineCollected.toFixed(2)}</p>
                </div>
              </div>

              {/* Row 3: Charts and Counts Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Payment Method Distribution Chart */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Amount By Method</h3>
                  {analytics.amountByPaymentMethod && Object.keys(analytics.amountByPaymentMethod).length > 0 ?
                    (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={Object.entries(analytics.amountByPaymentMethod).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                        >
                          {Object.entries(analytics.amountByPaymentMethod).map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center text-sm">No data for payment methods.</p>
                  )}
                </div>

                {/* Amount by Membership Plan Chart */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Amount By Membership Plan</h3>
                  {analytics.amountByMembershipPlan && Object.keys(analytics.amountByMembershipPlan).length > 0 ?
                    (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={Object.entries(analytics.amountByMembershipPlan).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                        >
                          {Object.entries(analytics.amountByMembershipPlan).map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center text-sm">No data for membership plans.</p>
                  )}

                {/* Counts by Method Table */}
                {analytics.countByMethod && Object.keys(analytics.countByMethod).length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow-sm lg:col-span-2">
                    <table className="min-w-full text-sm text-gray-700">
                          <thead>
                            <tr>
                              <th className="py-1 px-2 text-left font-medium">Method</th>
                              <th className="py-1 px-2 text-left font-medium">Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(analytics.countByMethod).map(([method, count]) => (
                              <tr key={method} className="border-t border-gray-100">
                                <td className="py-1 px-2">{method}</td>
                                <td className="py-1 px-2">{(count as number)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-600 col-span-full">No analytics data available for the selected range.</p>
              )}
            </div>
          )}

          {/* Recent Payments Table */}
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">Recent Payments</h2>
          {paymentsError && <p className="text-red-600 text-center mb-4">{paymentsError}</p>}
          {loadingPayments && payments.length === 0 && totalElements === 0 ?
            (
            <p className="text-center text-gray-600">Loading payments...</p>
          ) : (
            <div className="overflow-x-auto">
              {payments.length === 0 && totalElements === 0 ? (
                <p className="text-center text-gray-500">No payment records found.</p>
              ) : (
                <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
                  <thead>
                    <tr className="bg-gray-100">
                      {headers.map((header) => (
                        <th key={header.label} className={`py-3 px-4 border-b text-left text-gray-600 font-semibold ${header.width}`}>
                          {header.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.paymentId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-700 text-sm">{payment.paymentId}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm">{payment.userId}</td>
                        <td className="py-3 px-4 text-gray-700">{payment.userName}</td>
                        <td className="py-3 px-4 text-gray-700">INR {payment.amount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-gray-700">INR {payment.totalMembershipFee !== null && payment.totalMembershipFee !== undefined ? payment.totalMembershipFee.toFixed(2) : 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-700">INR {payment.dueAmount.toFixed(2)}</td>
                        <td className={`py-3 px-4 font-semibold w-[80px] ${payment.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {payment.dueAmount > 0 ? 'Due' : 'Paid'}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {payment.paymentDate ? format(new Date(payment.paymentDate), 'yyyy-MM-dd') : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-gray-700">{payment.paymentMethod}</td>
                        <td className="py-3 px-4 text-gray-700">{payment.paymentMethodDetail || 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-700">{payment.membershipPlanName || 'N/A'} {payment.membershipSession ? `(${payment.membershipSession})` : ''}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm">{payment.transactionId || 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm">{payment.notes || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleDeletePayment(payment.paymentId)}
                              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-md flex-shrink-0"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => generatePaymentReceiptPdf(payment, gymInfo)} // Call imported function
                              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-3 rounded-md flex items-center justify-center flex-shrink-0"
                              title="Print Receipt"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 p-4 bg-gray-50 rounded-lg shadow-inner">
                  <span className="text-gray-700 text-sm">Page {currentPage + 1} of {totalPages} ({totalElements} records total)</span>
                  <div className="space-x-2">
                    <button
                      onClick={() => setCurrentPage(0)}
                      disabled={currentPage === 0 || loadingPayments}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l-md disabled:opacity-50"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0 || loadingPayments}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPage === totalPages - 1 || loadingPayments}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 disabled:opacity-50"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages - 1)}
                      disabled={currentPage === totalPages - 1 || loadingPayments}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-r-md disabled:opacity-50"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    };

    export default PaymentsPage;