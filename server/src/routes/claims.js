import {Router} from 'express'; import {Claim} from '../models/index.js'; import {auth,allow} from '../middleware/auth.js'; const r=Router();r.use(auth,allow('Admin','Billing'));
r.get('/',async(req,res)=>res.json(await Claim.find().sort({ageDays:-1})));
r.patch('/:id/follow-up',async(req,res)=>res.json(await Claim.findByIdAndUpdate(req.params.id,{followUp:req.body.followUp||'Completed'},{new:true})));export default r;
