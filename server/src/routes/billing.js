import {Router} from 'express'; import {Revenue,Patient,Claim} from '../models/index.js'; import {auth,allow} from '../middleware/auth.js'; const r=Router();r.use(auth,allow('Admin','Billing'));
r.get('/revenue',async(req,res)=>res.json(await Revenue.find().sort({date:1}).limit(500)));
r.get('/outstanding',async(req,res)=>{const data=await Claim.find({status:{$in:['Pending','Denied']}}).sort({amount:-1}).limit(100);res.json(data)});
r.get('/leakage',async(req,res)=>{const d=await Revenue.aggregate([{$group:{_id:'$department',revenue:{$sum:'$revenue'},collections:{$sum:'$collections'}}},{$project:{_id:0,department:'$_id',leakage:{$subtract:['$revenue','$collections']}}},{$match:{leakage:{$gt:0}}},{$sort:{leakage:-1}}]);res.json(d)});export default r;
