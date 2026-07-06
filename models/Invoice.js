const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true },
  invoiceDate: { type: String },
  billTo: { type: String, required: true },
  event: { type: String, required: true },
  date: { type: String, required: true },
  contact: { type: String, required: true },
  venue: { type: String, required: true },
  particulars: [{ type: String }],
  deliverables: [{ type: String }],
  compliments: [{ type: String }],
  paymentDetails: [{ type: String }],
  total: { type: String, required: true },
  paidAmount: { type: Number, default: 0 },
  paymentHistory: [{ 
    amount: { type: Number },
    date: { type: String }
  }],
  status: { type: String, enum: ['Unpaid', 'Partially Paid', 'Paid'], default: 'Unpaid' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
