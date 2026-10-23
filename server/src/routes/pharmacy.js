import {Router} from 'express'; import {Medicine} from '../models/index.js'; import {auth,allow} from '../middleware/auth.js'; const r=Router();r.use(auth,allow('Admin','Pharmacy'));
r.get('/inventory',async(req,res)=>res.json(await Medicine.find().sort({stock:1})));
r.get('/consumption',async(req,res)=>res.json((await Medicine.find({},'name consumed30d')).sort((a,b)=>b.consumed30d-a.consumed30d)));
r.get('/reorder-recommendations',async(req,res)=>{const m=await Medicine.find();res.json(m.filter(x=>x.stock<=x.reorderLevel).map(x=>({name:x.name,stock:x.stock,reorderLevel:x.reorderLevel,recommendedOrder:Math.max(x.reorderLevel*2-x.stock,0)})))});export default r;
