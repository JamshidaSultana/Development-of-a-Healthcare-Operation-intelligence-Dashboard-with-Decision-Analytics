import {Router} from 'express';import jwt from 'jsonwebtoken';import {User} from '../models/index.js';import {auth} from '../middleware/auth.js';
const r=Router();
r.post('/login',async(req,res)=>{const {email,password}=req.body;const u=await User.findOne({email});if(!u||u.passwordHash!==password)return res.status(401).json({message:'Invalid credentials'});const displayName=u.email==='admin@medops.local'?'Gandhe Varshitha':u.name;const token=jwt.sign({id:u._id,email:u.email,name:displayName,role:u.role,doctorId:u.doctorId},process.env.JWT_SECRET,{expiresIn:'8h'});res.json({token,user:{name:displayName,email:u.email,role:u.role,doctorId:u.doctorId}})});
r.get('/me',auth,(req,res)=>res.json({user:req.user}));export default r;
