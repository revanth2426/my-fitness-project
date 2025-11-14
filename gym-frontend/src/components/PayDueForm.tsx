// src/components/PayDueForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosConfig';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

interface PayDueFormProps {
  originalPaymentId: number; // The ID of the payment record that has the due amount
  userId: number;
  userName: string;
  currentDueAmount: number; // The current outstanding due amount for this payment record
  originalMembershipSession: string | null; // Pass the session string from original payment 
  onPaymentSubmitted: () => void; // Callback after successful payment
  onCancel: () => void; // Callback to close the form
}

// PayDuePayload for the POST request to create a new payment for due
interface PayDuePayload {
  userId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentMethodDetail?: string | null;
  transactionId?: string;
  notes?: string;
  originalPaymentId: number; // Crucial for backend to link
  membershipSession?: string | null; // FIX: Allow 'null' here to match originalMembershipSession 
}


const PayDueForm: React.FC<PayDueFormProps> = ({
  originalPaymentId,
  userId,
  userName,
  currentDueAmount,
  originalMembershipSession,
  onPaymentSubmitted,
  onCancel,
}) => {
  const [formData, setFormData] = useState<PayDuePayload>({
    userId: userId,
    amount: currentDueAmount, // Pre-fill with current due
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: '',
    paymentMethodDetail: null,
    transactionId: '',
    notes: '',
    originalPaymentId: originalPaymentId,
    membershipSession: originalMembershipSession, // This assignment is now valid 
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newCalculatedDue, setNewCalculatedDue] = useState<number>(currentDueAmount);
  
  useEffect(() => {
    const amountPaid = formData.amount || 0;
    setNewCalculatedDue(Math.max(0, currentDueAmount - amountPaid));
  }, [formData.amount, currentDueAmount]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'paymentMethod' && value !== 'Online') {
      setFormData((prev) => ({ ...prev, paymentMethodDetail: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    if (formData.amount <= 0) {
      setFormError('Amount paid must be greater than zero.');
      setLoading(false);
      return;
    }
    if (formData.amount > currentDueAmount) {
      if (!window.confirm(`Amount paid (₹${formData.amount.toFixed(2)}) is greater than the current due (₹${currentDueAmount.toFixed(2)}). Continue with overpayment?`)) {
        setLoading(false);
        return;
      }
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

    try {
      const payload: PayDuePayload = {
        ...formData,
        userId: userId,
        amount: parseFloat(formData.amount.toString()),
        paymentMethodDetail: formData.paymentMethod === 'Online' && formData.paymentMethodDetail === 'Others' ?
          formData.notes : formData.paymentMethodDetail,
        originalPaymentId: originalPaymentId,
        membershipSession: originalMembershipSession,
      };

      await axiosInstance.post('/payments', payload);

      toast.success(`Due payment of ₹${payload.amount.toFixed(2)} recorded for ${userName}!`);
      onPaymentSubmitted();
      onCancel();
    } catch (err: any) {
      console.error('Failed to record due payment:', err);
      const errorMessage = err.response?.data?.message || 'Failed to record due payment. Please try again.';
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Record Due Payment for {userName}</h2>
      <form onSubmit={handleSubmit}>
        {formError && <p className="text-red-600 text-center mb-4 p-2 bg-red-100 rounded-md">{formError}</p>}

        {/* User and Original Due (Display Only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User:</label>
            <input
              type="text"
              value={`${userName} (ID: ${userId})`}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 cursor-not-allowed"
              readOnly
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Original Due:</label>
            <input
              type="text"
              value={`₹${currentDueAmount.toFixed(2)}`}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 cursor-not-allowed"
              readOnly
              disabled
            />
          </div>
        </div>

        {/* Original Membership Session (Display Only) */}
        {originalMembershipSession && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Original Payment Session:
            </label>
            <input
              type="text"
              value={originalMembershipSession}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 cursor-not-allowed"
              readOnly
              disabled
            />
          </div>
        )}

        {/* Amount Paid and New Due - Side by Side */}
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
              min="0.01"
              step="0.01"
              required
            />
          </div>
          <div>
            <label htmlFor="newDue" className="block text-sm font-medium text-gray-700 mb-1">
              Remaining Due:
            </label>
            <input
              type="text"
              id="newDue"
              name="newDue"
              value={`₹${newCalculatedDue.toFixed(2)}`}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 cursor-not-allowed"
              readOnly
              disabled
            />
          </div>
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
            {loading ? 'Submitting...' : 'Record Payment'}
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

export default PayDueForm;