import {Router} from 'express'; import {Doctor,Attendance} from '../models/index.js'; import {auth} from '../middleware/auth.js'; const r=Router();r.use(auth);
r.get('/doctors',async(req,res)=>{let d=await Doctor.find();if(req.user.role==='Doctor'&&req.user.doctorId)d=d.filter(x=>x.doctorId===req.user.doctorId);res.json(d)});
r.get('/attendance',async(req,res)=>res.json(await Attendance.find().sort({date:-1}).limit(600)));
r.get('/workload',async(req,res)=>res.json(await Doctor.find({},'name department appointments utilization').sort({utilization:-1})));export default r;
