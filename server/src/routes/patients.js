import { Router } from 'express';
import { Patient, Appointment } from '../models/index.js';
import { auth, allow } from '../middleware/auth.js';

const r = Router();

r.use(auth);

r.get('/', async (req, res) => {
  try {
    const q = {};

    if (req.query.search) {
      q.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { patientId: new RegExp(req.query.search, 'i') }
      ];
    }

    if (req.query.status) q.status = req.query.status;
    if (req.query.department) q.department = req.query.department;

    let data = await Patient.find(q)
      .sort({ createdAt: -1 })
      .limit(200);

    // Only apply doctor-specific filtering when authentication
    // has successfully provided a user.
    if (req.user && req.user.role === 'Doctor') {
      data = data.filter(p => p.department);
    }

    res.json(data);
  } catch (error) {
    console.error('Patients API error:', error);
    res.status(500).json({
      message: 'Failed to load patient records.'
    });
  }
});

r.post('/', allow('Admin'), async (req, res) => {
  try {
    const patient = await Patient.create(req.body);
    res.status(201).json(patient);
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({
      message: 'Failed to create patient.'
    });
  }
});

r.get('/appointments/calendar', async (req, res) => {
  try {
    const data = await Appointment.find()
      .sort({ date: 1 })
      .limit(500);

    res.json(data);
  } catch (error) {
    console.error('Appointments API error:', error);
    res.status(500).json({
      message: 'Failed to load appointments.'
    });
  }
});

r.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        message: 'Patient not found.'
      });
    }

    res.json(patient);
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      message: 'Failed to load patient.'
    });
  }
});

export default r;