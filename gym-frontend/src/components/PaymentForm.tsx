// src/components/PaymentForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosConfig';
import { toast } from 'react-toastify';
import { format, addMonths, subDays } from 'date-fns';

// Define interfaces to match Backend DTOs and Models
interface User {
  userId: number;
  name: string;
  contactNumber: string;
}

interface MembershipPlan {
  planId: number;
  planName: string;
  price: number;
  durationMonths: number;
}

interface PaymentDTO {
  userId: number;
  amount: number;
  totalMembershipFee?: number;
  membershipSession?: string | null; // Allow null here
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: string;
  paymentMethodDetail?: string | null;
  membershipPlanId: number | null;
  transactionId?: string;
  notes?: string;
  originalPaymentId?: number;
}

// Add PaymentResponseDTO as it's returned by the backend post method
interface PaymentResponseDTO {
  paymentId: number;
  userId: number;
  userName: string;
  amount: number;
  dueAmount: number;
  totalMembershipFee: number;
  membershipSession: string | null;
  paymentDate: string;
  paymentMethod: string;
  paymentMethodDetail: string | null;
  membershipPlanId: number | null;
  membershipPlanName: string | null;
  transactionId?: string;
  notes?: string;
}

interface PaymentFormProps {
  onPaymentAdded: () => void;
  onCancel: () => void;
  onPaymentSuccess: (payment: PaymentResponseDTO) => void; // NEW PROP: Callback with full payment object
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onPaymentAdded, onCancel, onPaymentSuccess }) => {
  const [formData, setFormData] = useState<PaymentDTO>({
    userId: 0,
    amount: 0,
    totalMembershipFee: 0,
    membershipSession: null, // Initialize with null
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: '',
    paymentMethodDetail: null,
    membershipPlanId: null,
    transactionId: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedPlanPrice, setSelectedPlanPrice] = useState<number>(0);
  const [calculatedDue, setCalculatedDue] = useState<number>(0);
  const [calculatedSession, setCalculatedSession] = useState<string | null>(null); // Allow null

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axiosInstance.get<MembershipPlan[]>('/plans');
        setMembershipPlans(response.data);
      } catch (err) {
        toast.error('Failed to load membership plans.');
        console.error('Error fetching plans:', err);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    const amount = formData.amount || 0;
    const due = selectedPlanPrice - amount;
    setCalculatedDue(Math.max(0, due));
  }, [formData.amount, selectedPlanPrice]);

  useEffect(() => {
    if (formData.membershipPlanId && formData.paymentDate) {
      const plan = membershipPlans.find(p => p.planId === formData.membershipPlanId);
      if (plan) {
        const startDate = new Date(formData.paymentDate);
        const endDate = subDays(addMonths(startDate, plan.durationMonths), 1);

        const startMonthYear = format(startDate, 'MMM yyyy');
        const endMonthYear = format(endDate, 'MMM yyyy');

        if (plan.durationMonths === 1) {
          setCalculatedSession(startMonthYear);
        } else {
          setCalculatedSession(`${startMonthYear} - ${endMonthYear}`);
        }
      } else {
        setCalculatedSession(null);
      }
    } else {
      setCalculatedSession(null);
    }
  }, [formData.membershipPlanId, formData.paymentDate, membershipPlans]);

  const debounce = (func: Function, delay: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };
  const handleUserSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        setUserSearchLoading(false);
        return;
      }
      setUserSearchLoading(true);
      try {
        const response = await axiosInstance.get<User[]>(`/dashboard/users/search`, { params: { query } });
        setUsers(response.data);
        setSearchResults(response.data);
      } catch (err) {
        console.error('User search failed:', err);
        setSearchResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 300),
    []
  );
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'paymentMethod' && value !== 'Online') {
      setFormData((prev) => ({ ...prev, paymentMethodDetail: null }));
    }

    if (name === 'membershipPlanId') {
        const planId = value === '' ? null : parseInt(value);
        const plan = planId !== null ? membershipPlans.find(p => p.planId === planId) : null;
        setSelectedPlanPrice(plan ? plan.price : 0);
        setFormData((prev) => ({
            ...prev,
            membershipPlanId: planId,
            totalMembershipFee: plan ? plan.price : 0
        }));
    }
     if (name === 'paymentDate') {
        setFormData((prev) => ({
            ...prev,
            paymentDate: value,
        }));
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setFormData((prev) => ({ ...prev, userId: user.userId }));
    setSearchQuery(`${user.name} (ID: ${user.userId})`);
    setSearchResults([]);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    if (!selectedUser) {
      setFormError('Please select a user.');
      setLoading(false);
      return;
    }
    if (formData.amount < 0) {
        setFormError('Amount must be positive or zero.');
        setLoading(false);
        return;
    }
    if (!formData.paymentMethod) {
        setFormError('Payment method is required.');
        setLoading(false);
        return;
    }
    if (formData.paymentMethod === 'Online' && !formData.paymentMethodDetail) {
      setFormError('Online payment source is required.');
      setLoading(false);
      return;
    }
    if (formData.paymentMethod === 'Online' && formData.paymentMethodDetail === 'Others' && (!formData.notes || formData.notes.trim() === '')) {
      setFormError('Please specify the custom online source in notes.');
      setLoading(false);
      return;
    }
    if (selectedPlanPrice > 0 && formData.amount > selectedPlanPrice) {
        if (!window.confirm(`Amount paid (${formData.amount}) is greater than the plan price (${selectedPlanPrice}). Continue with overpayment?`)) {
            setLoading(false);
            return;
        }
    }

    if (formData.membershipPlanId && !calculatedSession) {
      setFormError('Membership session could not be calculated. Please check payment date or plan duration.');
      setLoading(false);
      return;
    }


    try {
      const payload: PaymentDTO = {
        ...formData,
        amount: parseFloat(formData.amount.toString()),
        userId: selectedUser.userId,
        membershipPlanId: formData.membershipPlanId,
        totalMembershipFee: formData.membershipPlanId ? selectedPlanPrice : 0,
        membershipSession: calculatedSession, // Include calculated session
        paymentMethodDetail: formData.paymentMethod === 'Online' && formData.paymentMethodDetail === 'Others' ?
          formData.notes : formData.paymentMethodDetail,
      };

      const response = await axiosInstance.post<PaymentResponseDTO>('/payments', payload); // Capture response

      toast.success('Payment added successfully!');
      onPaymentAdded(); // Callback for parent to refresh lists
      onPaymentSuccess(response.data); // NEW: Trigger callback with full payment object
      onCancel();
    } catch (err: any) {
      console.error('Failed to add payment:', err);
      const errorMessage = err.response?.data?.message || 'Failed to add payment. Please check your input.';
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Add New Payment</h2>
      <form onSubmit={handleSubmit}>
        {formError && <p className="text-red-600 text-center mb-4 p-2 bg-red-100 rounded-md">{formError}</p>}
        
        {/* User Search and Selection */}
        <div className="mb-4 relative">
          <label htmlFor="userSearch" className="block text-sm font-medium text-gray-700 mb-1">
            Select User:<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="userSearch"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="Search user by name or ID..."
            value={selectedUser ? `${selectedUser.name} (ID: ${selectedUser.userId})` : searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedUser(null);
              handleUserSearch(e.target.value);
            }}
            // FIX: Removed setTimeout. We rely solely on the onMouseDown on the <li> items to prevent blur.
            onBlur={() => setSearchResults([])}
            onFocus={() => setSearchResults(searchResults)} // Show previous results on re-focus if any
            required
            autoComplete="off"
          />
          {userSearchLoading && searchQuery.length >= 2 && (
            <p className="text-gray-500 text-sm mt-1">Searching...</p>
          )}
          {searchResults.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
              {searchResults.map((user) => (
                <li
                  key={user.userId}
                  // RETAINED: onMouseDown prevents the input from losing focus immediately,
                  // allowing the subsequent onClick to select the user before blur.
                  onMouseDown={(e) => e.preventDefault()} 
                  onClick={() => handleSelectUser(user)}
                  className="p-2 cursor-pointer hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                >
                  {user.name} (ID: {user.userId})
                </li>
              ))}
            </ul>
          )}
          {!selectedUser && searchQuery.length >= 2 && !userSearchLoading && searchResults.length === 0 && (
            <p className="text-gray-500 text-sm mt-1">No users found.</p>
          )}
        </div>

        {/* Membership Plan (Optional) - Moved higher for due calculation */}
        <div className="mb-4">
          <label htmlFor="membershipPlanId" className="block text-sm font-medium text-gray-700 mb-1">
            Associated Membership Plan (Optional):
          </label>
          <select
            id="membershipPlanId"
            name="membershipPlanId"
            value={formData.membershipPlanId || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
          >
            <option value="">None / Other Payment</option>
            {membershipPlans.map((plan) => (
              <option key={plan.planId} value={plan.planId}>
                {plan.planName} (₹{plan.price} / {plan.durationMonths}mo)
              </option>
            ))}
          </select>
        </div>

        {/* Payment Date */}
        <div className="mb-4">
          <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1">
            Payment Date:<span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="paymentDate"
            name="paymentDate"
            value={formData.paymentDate}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>

        {/* Calculated Session (Display Only) */}
        {formData.membershipPlanId && (
          <div className="mb-4">
            <label htmlFor="membershipSession" className="block text-sm font-medium text-gray-700 mb-1">
              Membership Session:
            </label>
            <input
              type="text"
              id="membershipSession"
              name="membershipSession"
              value={calculatedSession || 'N/A'}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 cursor-not-allowed"
              readOnly
              disabled
            />
          </div>
        )}

        {/* Amount Paid and Due - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Paid:<span className="text-red-500">*</span>
                </label>
                <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    min="0" // Allow 0 for partial payment
                    step="0.01"
                    required
                />
            </div>
            <div>
                <label htmlFor="due" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Amount:
                </label>
                <input
                    type="text"
                    id="due"
                    name="due"
                    value={`₹${calculatedDue.toFixed(2)}`}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 cursor-not-allowed"
                    readOnly
                    disabled
                />
            </div>
        </div>

        {/* Payment Method and Source (Conditional) - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method:<span className="text-red-500">*</span>
                </label>
                <select
                    id="paymentMethod"
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
                    required
                >
                    <option value="">Select Method</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Online">Online</option>
                </select>
            </div>

            {formData.paymentMethod === 'Online' && (
                <div>
                    <label htmlFor="paymentMethodDetail" className="block text-sm font-medium text-gray-700 mb-1">
                        Online Source:<span className="text-red-500">*</span>
                    </label>
                    <select
                        id="paymentMethodDetail"
                        name="paymentMethodDetail"
                        value={formData.paymentMethodDetail || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
                        required
                    >
                        <option value="">Select Source</option>
                        <option value="PhonePe">PhonePe</option>
                        <option value="GooglePay">Google Pay</option>
                        <option value="Paytm">Paytm</option>
                        <option value="Others">Others</option>
                    </select>
                </div>
            )}
        </div>

        {/* Custom Online Source Text Input (if "Others" is selected) */}
        {formData.paymentMethod === 'Online' && formData.paymentMethodDetail === 'Others' && (
          <div className="mb-4">
            <label htmlFor="customOnlineSource" className="block text-sm font-medium text-gray-700 mb-1">
              Specify Other Online Source:<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="customOnlineSource"
              name="notes" // Store custom source in notes field
              value={formData.notes || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="e.g., Bank Transfer, UPI ID"
              required
            />
          </div>
        )}


        {/* Transaction ID (Optional) */}
        <div className="mb-4">
          <label htmlFor="transactionId" className="block text-sm font-medium text-gray-700 mb-1">
            Transaction ID (Optional):
          </label>
          <input
            type="text"
            id="transactionId"
            name="transactionId"
            value={formData.transactionId || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        {/* Notes (Optional) */}
        <div className="mb-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional):
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          ></textarea>
        </div>

        {/* Submit and Cancel Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
          >
            {loading ? 'Adding...' : 'Add Payment'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;