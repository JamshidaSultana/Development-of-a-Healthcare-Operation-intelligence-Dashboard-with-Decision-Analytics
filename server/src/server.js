import 'dotenv/config';
import express from 'express';import cors from 'cors';import mongoose from 'mongoose';import {createServer} from 'http';import {Server} from 'socket.io';
import auth from './routes/auth.js';import dashboard from './routes/dashboard.js';import patients from './routes/patients.js';import staff from './routes/staff.js';import billing from './routes/billing.js';import claims from './routes/claims.js';import pharmacy from './routes/pharmacy.js';import quality from './routes/quality.js';import ai from './routes/ai.js';
const app=express();const http=createServer(app);const io=new Server(http,{cors:{origin:process.env.CLIENT_URL||'http://localhost:5173'}});
app.use(cors({origin:process.env.CLIENT_URL||'http://localhost:5173'}));app.use(express.json());
app.get('/api/health',(req,res)=>res.json({ok:true,service:'Medical Operations Intelligence API'}));
app.use('/api/auth',auth);app.use('/api/dashboard',dashboard);app.use('/api/patients',patients);app.use('/api/staff',staff);app.use('/api/billing',billing);app.use('/api/claims',claims);app.use('/api/pharmacy',pharmacy);app.use('/api/quality',quality);app.use('/api/ai',ai);
io.on('connection',socket=>socket.emit('dashboard:connected',{at:new Date().toISOString()}));
const port=Number(process.env.PORT||5000);mongoose.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/medical_ops')
  .then(async () => {
    http.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch(e => {
    console.error('MongoDB connection failed:', e.message);
    process.exit(1);
  });