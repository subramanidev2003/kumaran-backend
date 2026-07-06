const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  date: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', ExpenseSchema);
