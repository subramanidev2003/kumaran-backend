const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const Invoice = require('./models/Invoice');
const Expense = require('./models/Expense');
const Album = require('./models/Album');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB Connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes

// Root endpoint to verify server is running
app.get('/', (req, res) => {
  res.send('Kumaran Studio API is running successfully!');
});

// 1. Get next available Invoice ID
app.get('/api/invoices/next-id', async (req, res) => {
  try {
    // Find all invoice IDs that match the pattern "KSI-XX"
    const invoices = await Invoice.find({ invoiceId: /^KSI-\d+$/ }, 'invoiceId');
    let maxId = 0;
    
    invoices.forEach(inv => {
      const match = inv.invoiceId.match(/^KSI-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    });

    const nextIdNumber = maxId + 1;
    const nextIdString = `KSI-${nextIdNumber.toString().padStart(2, '0')}`;
    
    res.status(200).json({ nextId: nextIdString });
  } catch (error) {
    console.error('Error generating next ID:', error);
    res.status(500).json({ error: 'Failed to generate next invoice ID' });
  }
});

// 2. Create a new invoice
app.post('/api/invoices', async (req, res) => {
  try {
    const newInvoice = new Invoice(req.body);
    const savedInvoice = await newInvoice.save();
    res.status(201).json(savedInvoice);
  } catch (error) {
    console.error('Error saving invoice:', error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern.invoiceId) {
      return res.status(400).json({ error: 'DuplicateInvoiceId', message: 'This Invoice Number already exists. Please use a different one.' });
    }
    res.status(500).json({ error: 'Failed to save invoice' });
  }
});

// 2. Get all invoices (sorted by newest first)
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.status(200).json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// 3. Update an invoice (e.g., add payment)
app.put('/api/invoices/:id', async (req, res) => {
  try {
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } // return the updated document
    );
    if (!updatedInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(200).json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// 5. Delete an invoice
app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const deletedInvoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!deletedInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// --- EXPENSE ROUTES ---

// 6. Get all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });
    res.status(200).json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// 7. Create a new expense
app.post('/api/expenses', async (req, res) => {
  try {
    const newExpense = new Expense(req.body);
    const savedExpense = await newExpense.save();
    res.status(201).json(savedExpense);
  } catch (error) {
    console.error('Error saving expense:', error);
    res.status(500).json({ error: 'Failed to save expense' });
  }
});

// 8. Delete an expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
    if (!deletedExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});
// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'kumaran_studio_albums',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'JPG', 'PNG', 'JPEG']
  }
});
const upload = multer({ storage: storage });

// --- ALBUM ROUTES ---

app.post('/api/albums', upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'galleryImages', maxCount: 15 }]), async (req, res) => {
  try {
    const { title, category } = req.body;
    
    if (!req.files || !req.files['coverImage']) {
      return res.status(400).json({ error: 'Cover image is required' });
    }

    const coverImageUrl = req.files['coverImage'][0].path;
    const galleryUrls = req.files['galleryImages'] ? req.files['galleryImages'].map(file => file.path) : [];

    const newAlbum = new Album({
      title,
      category,
      coverImage: coverImageUrl,
      gallery: galleryUrls
    });

    const savedAlbum = await newAlbum.save();
    res.status(201).json(savedAlbum);
  } catch (error) {
    console.error('Error uploading album:', error);
    res.status(500).json({ error: 'Failed to upload album' });
  }
});

app.get('/api/albums', async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category) query.category = category;
    const albums = await Album.find(query).sort({ createdAt: -1 });
    res.status(200).json(albums);
  } catch (error) {
    console.error('Error fetching albums:', error);
    res.status(500).json({ error: 'Failed to fetch albums' });
  }
});

app.delete('/api/albums/:id', async (req, res) => {
  try {
    const deletedAlbum = await Album.findByIdAndDelete(req.params.id);
    if (!deletedAlbum) {
      return res.status(404).json({ error: 'Album not found' });
    }
    res.status(200).json({ message: 'Album deleted successfully' });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ error: 'Failed to delete album' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
