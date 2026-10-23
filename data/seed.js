import dotenv from '../server/node_modules/dotenv/lib/main.js';

dotenv.config({
  path: new URL('../server/.env', import.meta.url)
});

import mongoose from '../server/node_modules/mongoose/index.js';

import {
  Patient,
  Doctor,
  Revenue,
  Claim,
  Medicine,
  Attendance,
  Appointment,
  Incident,
  AuditLog,
  User
} from '../server/src/models/index.js';

const departments = [
  'Cardiology',
  'Orthopedics',
  'General Medicine',
  'Pediatrics',
  'Radiology',
  'Neurology',
  'Dermatology',
  'ENT'
];

const locations = [
  'Hyderabad',
  'Bengaluru',
  'Chennai',
  'Mumbai',
  'Delhi',
  'Pune'
];

const firstNames = [
  'Aarav',
  'Diya',
  'Riya',
  'Kabir',
  'Ananya',
  'Ishaan',
  'Meera',
  'Vihaan',
  'Saanvi',
  'Arjun',
  'Nisha',
  'Rahul',
  'Tara',
  'Aditya',
  'Kavya',
  'Rohan',
  'Ira',
  'Dev',
  'Aditi',
  'Neil'
];

const lastNames = [
  'Sharma',
  'Reddy',
  'Patel',
  'Gupta',
  'Rao',
  'Mehta',
  'Khan',
  'Iyer',
  'Nair',
  'Verma'
];

const pick = (array) =>
  array[Math.floor(Math.random() * array.length)];

const rand = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/*
  Creates a date in 2026.

  month:
  1 = January
  2 = February
  ...
  12 = December
*/
const date2026 = (month, day) =>
  new Date(Date.UTC(2026, month - 1, day, 10, 0, 0));

const random2026 = () =>
  date2026(
    rand(1, 12),
    rand(1, 28)
  );

const date2027 = (month, day) =>
  new Date(Date.UTC(2027, month - 1, day, 10, 0, 0));


/* ================================
   CONNECT TO MONGODB
================================ */

await mongoose.connect(
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/medical_ops'
);

console.log('MongoDB connected');


/* ================================
   CLEAR OLD DEMO DATA
================================ */

console.log('Clearing old demo data...');

await Promise.all([
  Patient.deleteMany({}),
  Doctor.deleteMany({}),
  Revenue.deleteMany({}),
  Claim.deleteMany({}),
  Medicine.deleteMany({}),
  Attendance.deleteMany({}),
  Appointment.deleteMany({}),
  Incident.deleteMany({}),
  AuditLog.deleteMany({}),
  User.deleteMany({})
]);

console.log('Old demo data cleared');


/* ================================
   DOCTORS
================================ */

const doctors = Array.from(
  { length: 20 },
  (_, index) => ({
    doctorId:
      `DOC${String(index + 1).padStart(3, '0')}`,

    name:
      `Dr. ${pick(firstNames)} ${pick(lastNames)}`,

    department:
      departments[index % departments.length],

    location:
      locations[index % locations.length],

    appointments:
      rand(65, 220),

    revenue:
      rand(180000, 650000),

    utilization:
      rand(38, 96),

    shift:
      pick([
        'Morning',
        'Evening',
        'Night'
      ])
  })
);

await Doctor.insertMany(doctors);


/* ================================
   PATIENTS
   ================================ */

const patients = Array.from(
  { length: 4892 },
  (_, index) => {

    const createdAt = random2026();

    let status;

    if (index < 612) {
      status = 'Admitted';
    } else if (index < 1210) {
      status = 'Discharged';
    } else {
      status = 'Outpatient';
    }

    return {
      patientId:
        `PAT${String(index + 1).padStart(4, '0')}`,

      name:
        `${pick(firstNames)} ${pick(lastNames)}`,

      age:
        rand(1, 86),

      gender:
        pick([
          'Female',
          'Male'
        ]),

      phone:
        `9${rand(100000000, 999999999)}`,

      department:
        pick(departments),

      /*
        IMPORTANT:
        Every patient gets a city.
      */
      location:
        pick(locations),

      admissionDate:
        createdAt,

      dischargeDate:
        status === 'Discharged'
          ? new Date(
              createdAt.getTime() +
              rand(1, 5) * 86400000
            )
          : null,

      status,

      diagnosis:
        pick([
          'Hypertension',
          'Fracture',
          'Migraine',
          'Diabetes',
          'Asthma',
          'Routine check-up',
          'Infection'
        ]),

      waitMinutes:
        rand(12, 70),

      noShow:
        Math.random() < 0.078,

      createdAt,

      updatedAt:
        createdAt
    };
  }
);

await Patient.insertMany(patients);


/* ================================
   REVENUE
   ================================ */

const revenue = [];

const departmentWeights = [
  1.35,
  1.12,
  0.95,
  0.78,
  0.55,
  0.48,
  0.40,
  0.37
];

/*
  Create revenue for EVERY MONTH
  January → December 2026
*/
for (let month = 1; month <= 12; month++) {

  for (let day = 1; day <= 28; day++) {

    departments.forEach(
      (department, departmentIndex) => {

        const base =
          rand(8000, 18000) *
          departmentWeights[departmentIndex];

        revenue.push({
          date:
            date2026(month, day),

          department,

          /*
            Revenue also gets a city.
          */
          location:
            locations[
              (month +
                departmentIndex +
                day) %
              locations.length
            ],

          revenue:
            Math.round(base),

          collections:
            Math.round(
              base *
              rand(86, 97) /
              100
            )
        });
      }
    );
  }
}

await Revenue.insertMany(revenue);


/* ================================
   CLAIMS
================================ */

const claims = Array.from(
  { length: 240 },
  (_, index) => {

    const submittedAt =
      random2026();

    const status =
      pick([
        'Pending',
        'Pending',
        'Approved',
        'Approved',
        'Denied'
      ]);

    return {
      claimId:
        `CLM${String(index + 1).padStart(4, '0')}`,

      patientName:
        `${pick(firstNames)} ${pick(lastNames)}`,

      department:
        pick(departments),

      location:
        pick(locations),

      amount:
        rand(5000, 70000),

      status,

      denialReason:
        status === 'Denied'
          ? pick([
              'Missing documentation',
              'Coding mismatch',
              'Eligibility issue',
              'Duplicate claim'
            ])
          : '',

      submittedAt,

      ageDays:
        rand(1, 90),

      followUp:
        pick([
          'Not Started',
          'In Progress',
          'Completed'
        ]),

      aiPrediction:
        pick([
          'Low Risk',
          'Medium Risk',
          'High Risk'
        ])
    };
  }
);

await Claim.insertMany(claims);


/* ================================
   PHARMACY
================================ */

const medicines = Array.from(
  { length: 50 },
  (_, index) => ({

    medicineId:
      `MED${String(index + 1).padStart(3, '0')}`,

    name:
      `${pick([
        'Amoxicillin',
        'Metformin',
        'Paracetamol',
        'Atorvastatin',
        'Cetirizine',
        'Azithromycin',
        'Pantoprazole',
        'Insulin'
      ])} ${rand(5, 500)}mg`,

    category:
      pick([
        'Antibiotic',
        'Analgesic',
        'Chronic Care',
        'Gastro',
        'Allergy'
      ]),

    location:
      locations[index % locations.length],

    stock:
      rand(5, 300),

    reorderLevel:
      rand(30, 90),

    expiryDate:
      date2027(
        rand(1, 12),
        rand(1, 28)
      ),

    unitCost:
      rand(20, 600),

    consumed30d:
      rand(20, 250)
  })
);

await Medicine.insertMany(medicines);


/* ================================
   STAFF ATTENDANCE
================================ */

const attendance = [];

for (
  let month = 1;
  month <= 12;
  month++
) {

  for (
    let day = 1;
    day <= 7;
    day++
  ) {

    for (
      let staff = 0;
      staff < 10;
      staff++
    ) {

      attendance.push({

        date:
          date2026(month, day),

        staffName:
          `${pick(firstNames)} ${pick(lastNames)}`,

        role:
          pick([
            'Nurse',
            'Technician',
            'Reception',
            'Pharmacist'
          ]),

        status:
          pick([
            'Present',
            'Present',
            'Present',
            'Absent',
            'Late'
          ]),

        shift:
          pick([
            'Morning',
            'Evening',
            'Night'
          ])
      });
    }
  }
}

await Attendance.insertMany(attendance);


/* ================================
   APPOINTMENTS
================================ */

const appointments = Array.from(
  { length: 300 },
  (_, index) => {

    const doctor =
      doctors[index % doctors.length];

    return {

      patientName:
        `${pick(firstNames)} ${pick(lastNames)}`,

      doctorName:
        doctor.name,

      department:
        doctor.department,

      date:
        date2026(
          rand(1, 12),
          rand(1, 28)
        ),

      status:
        pick([
          'Scheduled',
          'Completed',
          'No-show',
          'Cancelled'
        ]),

      durationMinutes:
        pick([
          15,
          20,
          30,
          45
        ])
    };
  }
);

await Appointment.insertMany(appointments);


/* ================================
   INCIDENTS
================================ */

await Incident.insertMany(
  Array.from(
    { length: 25 },
    (_, index) => ({

      incidentId:
        `INC${String(index + 1).padStart(3, '0')}`,

      type:
        pick([
          'Medication',
          'Patient Safety',
          'Facility',
          'Documentation'
        ]),

      severity:
        pick([
          'Low',
          'Medium',
          'High'
        ]),

      department:
        pick(departments),

      status:
        pick([
          'Open',
          'Under Review',
          'Closed'
        ]),

      reportedAt:
        random2026(),

      description:
        'Synthetic incident record for dashboard demonstration.'
    })
  )
);


/* ================================
   AUDIT LOGS
================================ */

await AuditLog.insertMany(
  Array.from(
    { length: 100 },
    () => ({

      user:
        pick([
          'admin@medops.local',
          'billing@medops.local',
          'doctor@medops.local'
        ]),

      action:
        pick([
          'Viewed dashboard',
          'Exported report',
          'Updated claim',
          'Reviewed incident'
        ]),

      module:
        pick([
          'Dashboard',
          'Billing',
          'Claims',
          'Quality'
        ]),

      createdAt:
        random2026(),

      ip:
        '127.0.0.1'
    })
  )
);


/* ================================
   USERS
================================ */

await User.insertMany([

  {
    name:
      'Gandhe Varshitha',

    email:
      'admin@medops.local',

    passwordHash:
      'Demo@12345',

    role:
      'Admin'
  },

  {
    name:
      'Dr. Demo',

    email:
      'doctor@medops.local',

    passwordHash:
      'Demo@12345',

    role:
      'Doctor',

    doctorId:
      doctors[0].doctorId
  },

  {
    name:
      'Billing Manager',

    email:
      'billing@medops.local',

    passwordHash:
      'Demo@12345',

    role:
      'Billing'
  },

  {
    name:
      'Pharmacy Manager',

    email:
      'pharmacy@medops.local',

    passwordHash:
      'Demo@12345',

    role:
      'Pharmacy'
  }
]);


/* ================================
   FINISHED
================================ */

console.log(
  `Seed complete: ` +
  `4,892 patients, ` +
  `${doctors.length} doctors, ` +
  `${revenue.length} revenue records, ` +
  `${claims.length} claims, ` +
  `${medicines.length} medicines ` +
  `across ${locations.length} cities ` +
  `for Jan-Dec 2026.`
);

await mongoose.disconnect();