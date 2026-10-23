import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  patientId:{type:String,unique:true}, name:String, age:Number, gender:String, phone:String, department:String,location: String,
  admissionDate:Date, dischargeDate:Date, status:{type:String,enum:['Outpatient','Admitted','Discharged']}, diagnosis:String,
  waitMinutes:Number, noShow:Boolean
},{timestamps:true});
const doctorSchema = new mongoose.Schema({doctorId:{type:String,unique:true},name:String,department:String,location: String,appointments:Number,revenue:Number,utilization:Number,shift:String});
const revenueSchema = new mongoose.Schema({
  date: Date,
  department: String,
  revenue: Number,
  collections: Number,
  location: String
});
const claimSchema = new mongoose.Schema({claimId:{type:String,unique:true},patientName:String,department:String,amount:Number,status:String,location: String,denialReason:String,submittedAt:Date,ageDays:Number,followUp:String,aiPrediction:String});
const medicineSchema = new mongoose.Schema({medicineId:String,name:String,category:String,stock:Number,reorderLevel:Number,expiryDate:Date,location: String,unitCost:Number,consumed30d:Number});
const attendanceSchema = new mongoose.Schema({date:Date,staffName:String,role:String,status:String,shift:String});
const appointmentSchema = new mongoose.Schema({patientName:String,doctorName:String,department:String,date:Date,status:String,durationMinutes:Number});
const incidentSchema = new mongoose.Schema({incidentId:String,type:String,severity:String,department:String,status:String,reportedAt:Date,description:String});
const auditSchema = new mongoose.Schema({user:String,action:String,module:String,createdAt:Date,ip:String});
const userSchema = new mongoose.Schema({name:String,email:{type:String,unique:true},passwordHash:String,role:{type:String,enum:['Admin','Doctor','Billing','Pharmacy']},doctorId:String});
export const Patient=mongoose.model('Patient',patientSchema); export const Doctor=mongoose.model('Doctor',doctorSchema); export const Revenue=mongoose.model('Revenue',revenueSchema); export const Claim=mongoose.model('Claim',claimSchema); export const Medicine=mongoose.model('Medicine',medicineSchema); export const Attendance=mongoose.model('Attendance',attendanceSchema); export const Appointment=mongoose.model('Appointment',appointmentSchema); export const Incident=mongoose.model('Incident',incidentSchema); export const AuditLog=mongoose.model('AuditLog',auditSchema); export const User=mongoose.model('User',userSchema);
