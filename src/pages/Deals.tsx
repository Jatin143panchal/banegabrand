// src/pages/SalesPunch.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, IndianRupee, Loader2, User, Building2, Calendar, Clock, 
  FileText, CheckCircle, XCircle, AlertCircle, Edit2, Trash2,
  Paperclip, Image, File, X, Download, Eye
} from "lucide-react";
import { format } from "date-fns";

// ==================== TYPES ====================
interface PaymentSlip {
  id: string;
  fileName: string;
  fileData: string;
  fileType: string;
  uploadedAt: string;
}

interface SalesEntry {
  id: string;
  date: string;
  clientName: string;
  mobile: string;
  address: string;
  state: string;
  hasGst: boolean;
  amount: number;
  product: string;
  paymentMode: 'UPI' | 'Netbanking' | 'Razorpay' | 'Cash' | 'Other';
  paymentSlips: PaymentSlip[];
  notes: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  request_number?: string;
  created_by?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  completed_at?: string | null;
  budget_allocated?: number;
  budget_utilized?: number;
  category?: string;
  assigned_to?: string | null;
}

interface SalesFormData {
  clientName: string;
  mobile: string;
  address: string;
  state: string;
  hasGst: boolean;
  amount: number;
  product: string;
  paymentMode: 'UPI' | 'Netbanking' | 'Razorpay' | 'Cash' | 'Other';
  notes: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  budget_allocated: number;
  expected_completion_date: string;
}

// ==================== CONSTANTS ====================
const statuses = [
  { key: "draft", label: "Draft", color: "bg-gray-400" },
  { key: "submitted", label: "Submitted", color: "bg-blue-500" },
  { key: "approved", label: "Approved", color: "bg-green-500" },
  { key: "rejected", label: "Rejected", color: "bg-red-500" },
  { key: "cancelled", label: "Cancelled", color: "bg-gray-500" },
  { key: "completed", label: "Completed", color: "bg-emerald-500" },
] as const;

const priorities = [
  { key: "low", label: "Low", color: "bg-blue-100 text-blue-700" },
  { key: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  { key: "high", label: "High", color: "bg-orange-100 text-orange-700" },
  { key: "urgent", label: "Urgent", color: "bg-red-100 text-red-700" },
] as const;

// ==================== MAIN COMPONENT ====================
const SalesPunch: React.FC = () => {
  // ---------- STATE ----------
  const [entries, setEntries] = useState<SalesEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [showForm, setShowForm] = useState<boolean>(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showSlipModal, setShowSlipModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<SalesFormData>({
    clientName: '',
    mobile: '',
    address: '',
    state: '',
    hasGst: false,
    amount: 0,
    product: '',
    paymentMode: 'Cash',
    notes: '',
    priority: 'medium',
    category: '',
    budget_allocated: 0,
    expected_completion_date: '',
  });

  // ---------- LOCAL STORAGE ----------
  useEffect(() => {
    const saved = localStorage.getItem('salesPunchEntries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const fixed = parsed.map((entry: any) => ({
          ...entry,
          paymentSlips: entry.paymentSlips || [],
          notes: entry.notes || '',
          state: entry.state || '',
          status: entry.status || 'draft',
          priority: entry.priority || 'medium',
          category: entry.category || '',
          budget_allocated: entry.budget_allocated || 0,
          budget_utilized: entry.budget_utilized || 0,
          expected_completion_date: entry.expected_completion_date || '',
          request_number: entry.request_number || `REQ-${String(Date.now()).slice(-6)}`,
        }));
        setEntries(fixed);
      } catch (e) {
        console.error('Error loading data:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('salesPunchEntries', JSON.stringify(entries));
  }, [entries]);

  // ---------- HELPERS ----------
  function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatCurrencyLakh = (amount: number): string => {
    return `₹${(amount / 100000).toFixed(1)}L`;
  };

  const getPaymentEmoji = (mode: string): string => {
    const map: Record<string, string> = {
      Cash: '💵',
      UPI: '📱',
      Netbanking: '🏦',
      Razorpay: '⚡',
      Other: '🔄',
    };
    return map[mode] || '🔄';
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getPriorityColor = (priority: string): string => {
    const p = priorities.find(p => p.key === priority);
    return p ? p.color : 'bg-gray-100 text-gray-700';
  };

  // ---------- CRUD ----------
  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim() || !form.mobile.trim() || form.amount <= 0) {
      alert('Please fill Client Name, Mobile, and Amount correctly!');
      return;
    }

    const newEntry: SalesEntry = {
      id: Date.now().toString(),
      date: selectedDate,
      clientName: form.clientName.trim(),
      mobile: form.mobile.trim(),
      address: form.address.trim(),
      state: form.state.trim(),
      hasGst: form.hasGst,
      amount: form.amount,
      product: form.product.trim(),
      paymentMode: form.paymentMode,
      paymentSlips: [],
      notes: form.notes.trim(),
      status: 'draft',
      priority: form.priority,
      category: form.category.trim(),
      budget_allocated: form.budget_allocated || 0,
      budget_utilized: 0,
      expected_completion_date: form.expected_completion_date || '',
      request_number: `REQ-${String(Date.now()).slice(-6)}`,
    };

    setEntries([...entries, newEntry]);
    resetForm();
    setShowForm(false);
  };

  const handleUpdateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim() || !form.mobile.trim() || form.amount <= 0) {
      alert('Please fill Client Name, Mobile, and Amount correctly!');
      return;
    }

    if (!editingId) return;

    setEntries(entries.map(entry => {
      if (entry.id === editingId) {
        return {
          ...entry,
          date: selectedDate,
          clientName: form.clientName.trim(),
          mobile: form.mobile.trim(),
          address: form.address.trim(),
          state: form.state.trim(),
          hasGst: form.hasGst,
          amount: form.amount,
          product: form.product.trim(),
          paymentMode: form.paymentMode,
          notes: form.notes.trim(),
          priority: form.priority,
          category: form.category.trim(),
          budget_allocated: form.budget_allocated || 0,
          expected_completion_date: form.expected_completion_date || '',
        };
      }
      return entry;
    }));

    resetForm();
    setShowForm(false);
    setEditingId(null);
  };

  const handleDeleteEntry = (id: string) => {
    if (window.confirm('Delete this entry?')) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const handleEditEntry = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (entry) {
      setForm({
        clientName: entry.clientName,
        mobile: entry.mobile,
        address: entry.address,
        state: entry.state || '',
        hasGst: entry.hasGst,
        amount: entry.amount,
        product: entry.product,
        paymentMode: entry.paymentMode,
        notes: entry.notes || '',
        priority: entry.priority || 'medium',
        category: entry.category || '',
        budget_allocated: entry.budget_allocated || 0,
        expected_completion_date: entry.expected_completion_date || '',
      });
      setSelectedDate(entry.date);
      setEditingId(id);
      setShowForm(true);
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    setEntries(entries.map(entry => {
      if (entry.id === id) {
        const updates: Partial<SalesEntry> = { status: newStatus as any };
        if (newStatus === 'approved') updates.approved_at = new Date().toISOString();
        if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
        if (newStatus === 'submitted') updates.submitted_at = new Date().toISOString();
        if (newStatus === 'rejected') updates.rejection_reason = 'Rejected by approver';
        return { ...entry, ...updates };
      }
      return entry;
    }));
  };

  const resetForm = () => {
    setForm({
      clientName: '',
      mobile: '',
      address: '',
      state: '',
      hasGst: false,
      amount: 0,
      product: '',
      paymentMode: 'Cash',
      notes: '',
      priority: 'medium',
      category: '',
      budget_allocated: 0,
      expected_completion_date: '',
    });
    setEditingId(null);
  };

  const handleCancelForm = () => {
    resetForm();
    setShowForm(false);
  };

  // ---------- PAYMENT SLIP HANDLERS ----------
  const handleAddSlip = (entryId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const newSlip: PaymentSlip = {
        id: Date.now().toString(),
        fileName: file.name,
        fileData: base64,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
      };

      setEntries(entries.map(entry => {
        if (entry.id === entryId) {
          return {
            ...entry,
            paymentSlips: [...(entry.paymentSlips || []), newSlip],
          };
        }
        return entry;
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteSlip = (entryId: string, slipId: string) => {
    if (window.confirm('Delete this payment slip?')) {
      setEntries(entries.map(entry => {
        if (entry.id === entryId) {
          return {
            ...entry,
            paymentSlips: (entry.paymentSlips || []).filter(slip => slip.id !== slipId),
          };
        }
        return entry;
      }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedEntryId) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      handleAddSlip(selectedEntryId, file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openSlipModal = (entryId: string) => {
    setSelectedEntryId(entryId);
    setShowSlipModal(true);
  };

  const closeSlipModal = () => {
    setShowSlipModal(false);
    setSelectedEntryId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ---------- FILTERED DATA ----------
  const filteredEntries = entries
    .filter(entry => entry.date === selectedDate)
    .filter(entry => selectedStatus === 'all' || entry.status === selectedStatus);
  
  const totalAmount = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);

  // ---------- PIPELINE DATA ----------
  const pipelineEntries = entries;
  const pipelineTotals = statuses.reduce((acc, status) => {
    const items = pipelineEntries.filter(e => e.status === status.key);
    acc[status.key] = items.reduce((sum, e) => sum + e.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  // ---------- RENDER ----------
  return (
    <div className="h-full bg-gray-50 p-4 md:p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* ===== HEADER ===== */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-4 md:mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                💰 Sales Punch
              </h2>
              <p className="text-sm text-gray-500 mt-1">Daily payment entries with approval pipeline</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'pipeline' : 'list')}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
              >
                {viewMode === 'list' ? '📊 Pipeline View' : '📋 List View'}
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(!showForm);
                }}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                {showForm ? '✕ Close Form' : '➕ New Entry'}
              </button>
            </div>
          </div>
        </div>

        {/* ===== DATE FILTER & TOTAL ===== */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-white text-sm font-medium whitespace-nowrap">Select Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border-0 text-sm focus:ring-2 focus:ring-white outline-none w-full sm:w-auto"
              />
              {viewMode === 'list' && (
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border-0 text-sm focus:ring-2 focus:ring-white outline-none bg-white"
                >
                  <option value="all">All Status</option>
                  {statuses.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="text-white text-right w-full sm:w-auto">
              <p className="text-xs opacity-80">Total Collection</p>
              <p className="text-2xl md:text-3xl font-bold">{formatCurrency(totalAmount)}</p>
              <p className="text-xs opacity-80">{filteredEntries.length} entries</p>
            </div>
          </div>
        </div>

        {/* ===== FORM ===== */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-4 md:mb-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              {editingId ? '✏️ Edit Entry' : '📝 New Entry'}
            </h3>

            <form onSubmit={editingId ? handleUpdateEntry : handleAddEntry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Rajesh Sharma"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="9876543210"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="123, Main Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Maharashtra"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={form.amount || ''}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Product / Service
                  </label>
                  <input
                    type="text"
                    value={form.product}
                    onChange={(e) => setForm({ ...form, product: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Website Development"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={form.paymentMode}
                    onChange={(e) => setForm({ ...form, paymentMode: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Cash">💵 Cash</option>
                    <option value="UPI">📱 UPI</option>
                    <option value="Netbanking">🏦 Netbanking</option>
                    <option value="Razorpay">⚡ Razorpay</option>
                    <option value="Other">🔄 Other</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="text-sm font-medium text-gray-600 whitespace-nowrap">GST Registered:</label>
                  <input
                    type="checkbox"
                    checked={form.hasGst}
                    onChange={(e) => setForm({ ...form, hasGst: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">{form.hasGst ? '✅ Yes' : '❌ No'}</span>
                </div>
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {priorities.map(p => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Software, Consulting, etc."
                  />
                </div>
              </div>

              {/* Budget & Expected Completion */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Budget Allocated (₹)
                  </label>
                  <input
                    type="number"
                    value={form.budget_allocated || ''}
                    onChange={(e) => setForm({ ...form, budget_allocated: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Expected Completion Date
                  </label>
                  <input
                    type="date"
                    value={form.expected_completion_date}
                    onChange={(e) => setForm({ ...form, expected_completion_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition"
                >
                  {editingId ? '💾 Update Entry' : '✅ Save Entry'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===== PIPELINE VIEW ===== */}
        {viewMode === 'pipeline' ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {statuses.map(status => {
              const statusRequests = pipelineEntries.filter(r => r.status === status.key);
              const totalAmount = statusRequests.reduce((s, r) => s + (r.amount || 0), 0);

              return (
                <div key={status.key} className="space-y-3">
                  {/* Column Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
                      <h3 className="text-sm font-semibold">{status.label}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {statusRequests.length}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {formatCurrencyLakh(totalAmount)} total
                  </p>

                  {/* Cards */}
                  <div className="space-y-2">
                    {statusRequests.map(request => {
                      const priority = priorities.find(p => p.key === request.priority);
                      
                      return (
                        <Card key={request.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            {/* Request Number & Priority */}
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                {request.request_number || `REQ-${request.id.slice(-6)}`}
                              </p>
                              {priority && (
                                <Badge className={`text-xs ${priority.color}`}>
                                  {priority.label}
                                </Badge>
                              )}
                            </div>

                            {/* Title */}
                            <p className="text-sm font-medium truncate mt-1">
                              {request.clientName} - {request.product || 'N/A'}
                            </p>

                            {/* Client & Company */}
                            <div className="flex items-center gap-2 mt-1">
                              <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <p className="text-xs text-muted-foreground truncate">
                                {request.clientName}
                              </p>
                              {request.state && (
                                <>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground truncate">
                                    {request.state}
                                  </p>
                                </>
                              )}
                            </div>

                            {/* Amount & Date */}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm font-semibold flex items-center gap-1">
                                <IndianRupee className="h-3 w-3 flex-shrink-0" />
                                {formatCurrency(request.amount || 0)}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                {request.expected_completion_date 
                                  ? format(new Date(request.expected_completion_date), 'dd/MM/yy')
                                  : 'N/A'}
                              </span>
                            </div>

                            {/* ===== ACTION BUTTONS ===== */}
                            {request.status === 'draft' && (
                              <Button 
                                size="sm" 
                                className="w-full mt-2 h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(request.id, 'submitted');
                                }}
                              >
                                Submit for Approval
                              </Button>
                            )}

                            {request.status === 'submitted' && (
                              <div className="flex gap-2 mt-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-green-600 border-green-600 hover:bg-green-50 h-7 text-xs flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(request.id, 'approved');
                                  }}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600 border-red-600 hover:bg-red-50 h-7 text-xs flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(request.id, 'rejected');
                                  }}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}

                            {request.status === 'approved' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-emerald-600 border-emerald-600 hover:bg-emerald-50 h-7 text-xs w-full mt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(request.id, 'completed');
                                }}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Mark Completed
                              </Button>
                            )}

                            {request.status === 'rejected' && (
                              <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
                                <AlertCircle className="h-3 w-3 inline mr-1" />
                                Rejected
                              </div>
                            )}

                            {request.status === 'completed' && (
                              <div className="mt-2 p-2 bg-emerald-50 rounded text-xs text-emerald-600">
                                <CheckCircle className="h-3 w-3 inline mr-1" />
                                Completed on {request.completed_at ? format(new Date(request.completed_at), 'dd/MM/yy') : 'N/A'}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}

                    {/* Empty State */}
                    {statusRequests.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed rounded-lg">
                        <p className="text-xs text-muted-foreground">No requests</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ===== LIST VIEW ===== */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 md:p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-700">
                📋 Entries ({filteredEntries.length})
              </h3>
              <span className="text-xs text-gray-500">
                Total: {formatCurrency(totalAmount)}
              </span>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 md:py-12 text-gray-400">
                <p className="text-4xl md:text-5xl mb-3">📭</p>
                <p className="text-sm">No entries for this date</p>
                <p className="text-xs">Click "New Entry" to add your first sale</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-gray-600 text-xs uppercase tracking-wider">
                      <th className="py-2 md:py-3 px-2 md:px-4 font-semibold">#</th>
                      <th className="py-2 md:py-3 px-2 md:px-4 font-semibold">Client</th>
                      <th className="py-2 md:py-3 px-2 md:px-4 font-semibold hidden sm:table-cell">Mobile</th>
                      <th className="py-2 md:py-3 px-2 md:px-4 font-semibold hidden lg:table-cell">State</th>
                      <th className="py-2 md:py-3 px-2 md:px-4 font-semibold hidden md:table-cell">Product</th>
                      <th className="py-2 md:py-3 px-2 md:px-4 font-semibold">Amount</th>
                      <th className="py-2 md:py-3 px-2 md:px-4 font-semibold hidden sm:table-cell">Payment</th>
                      <th className="py-2 md:py-3 px-2 md:px-4 font-semibold">Status</th>
                      <th className="py-2 md:py-3 px-2 md:px-4 font-semibold text-center">Slips</th>
                      <th className="py-2 md:py-3 px-2 md:px-4 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEntries.map((entry, index) => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition">
                        <td className="py-2 md:py-3 px-2 md:px-4 text-gray-500 text-center">{index + 1}</td>
                        <td className="py-2 md:py-3 px-2 md:px-4">
                          <div className="font-medium text-gray-700">
                            {entry.clientName}
                            {entry.hasGst && (
                              <span className="ml-1 md:ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                GST
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 sm:hidden">
                            {entry.mobile}
                          </div>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 text-gray-600 hidden sm:table-cell">
                          {entry.mobile}
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 text-gray-600 hidden lg:table-cell">
                          {entry.state || '—'}
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 text-gray-600 hidden md:table-cell">
                          {entry.product || '—'}
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 font-bold text-gray-800 whitespace-nowrap">
                          {formatCurrency(entry.amount)}
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 hidden sm:table-cell">
                          <span className="text-[10px] bg-gray-100 px-1.5 py-1 rounded-full whitespace-nowrap">
                            {getPaymentEmoji(entry.paymentMode)} {entry.paymentMode}
                          </span>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4">
                          <Badge className={`text-xs ${
                            entry.status === 'draft' ? 'bg-gray-200 text-gray-700' :
                            entry.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                            entry.status === 'approved' ? 'bg-green-100 text-green-700' :
                            entry.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            entry.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {entry.status || 'draft'}
                          </Badge>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 text-center">
                          <button
                            onClick={() => openSlipModal(entry.id)}
                            className="relative text-indigo-500 hover:text-indigo-700 p-1 rounded hover:bg-indigo-50 transition"
                            title="View/Add Slips"
                          >
                            <Paperclip className="h-4 w-4" />
                            {(entry.paymentSlips && entry.paymentSlips.length > 0) && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                {entry.paymentSlips.length}
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4">
                          <div className="flex items-center justify-center gap-1 md:gap-2">
                            <button
                              onClick={() => handleEditEntry(entry.id)}
                              className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== PAYMENT SLIP MODAL ===== */}
      {showSlipModal && selectedEntryId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Payment Slips
              </h3>
              <button
                onClick={closeSlipModal}
                className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4 md:p-6">
              {/* Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 md:p-6 mb-6 text-center">
                <p className="text-gray-600 mb-1">Upload Payment Slip</p>
                <p className="text-xs text-gray-400 mb-3">Supported: JPG, PNG, PDF (Max 5MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {/* Slips List */}
              {(() => {
                const entry = entries.find(e => e.id === selectedEntryId);
                if (!entry) return null;

                const slips = entry.paymentSlips || [];

                if (slips.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-4xl mb-2">📭</p>
                      <p className="text-sm">No payment slips uploaded</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {slips.map((slip) => (
                      <div key={slip.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="relative bg-gray-50 p-2">
                          {slip.fileType && slip.fileType.startsWith('image/') ? (
                            <img
                              src={slip.fileData}
                              alt={slip.fileName}
                              className="w-full h-32 md:h-40 object-contain rounded"
                            />
                          ) : (
                            <div className="w-full h-32 md:h-40 flex items-center justify-center bg-gray-100 rounded">
                              <div className="text-center">
                                <File className="h-12 w-12 text-gray-400 mx-auto" />
                                <p className="text-xs text-gray-600 truncate px-2 mt-2">{slip.fileName}</p>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteSlip(selectedEntryId, slip.id)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="p-2 text-xs text-gray-500">
                          <p className="truncate font-medium">{slip.fileName}</p>
                          <p>Uploaded: {formatDate(slip.uploadedAt)} at {formatTime(slip.uploadedAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPunch;
