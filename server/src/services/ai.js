import OpenAI from 'openai';
import {
   
  Patient,
  Doctor,
  Revenue,
  Claim,
  Medicine
} from '../models/index.js';
 function isFutureMonth(month) {
  if (!month) return false;

  const now = new Date();
  const [year, monthNumber] = month.split('-').map(Number);

  return (
    year > now.getFullYear() ||
    (year === now.getFullYear() &&
      monthNumber > now.getMonth() + 1)
  );
}

export async function dashboardContext({ month, location } = {}) {
      if (month && isFutureMonth(month)) {
    return {
      patients: [],
      doctors: [],
      revenue: [],
      claims: [],
      medicines: [],
      upcoming: true,
      month,
      location: location || 'All Locations'
    };
  }
  const [patients, doctors, revenue, claims, medicines] = await Promise.all([
    Patient.find().lean(),
    Doctor.find().lean(),
    Revenue.find().sort({ date: -1 }).limit(90).lean(),
    Claim.find().lean(),
    Medicine.find().lean()
  ]);

  return {
    patients: patients.map(p => ({
      patientId: p.patientId,
      department: p.department,
      status: p.status,
      waitMinutes: p.waitMinutes,
      noShow: p.noShow,
      admissionDate: p.admissionDate,
      location: p.location
    })),
    doctors,
    revenue,
    claims,
    medicines
  };
}

export async function askCopilot(question) {
    function isFutureMonth(month) {
  if (!month) return false;

  const now = new Date();

  const [year, monthNumber] = month.split('-').map(Number);

  return (
    year > now.getFullYear() ||
    (year === now.getFullYear() &&
      monthNumber > now.getMonth() + 1)
  );
}
  const context = await dashboardContext();

  /*
   * If an OpenAI API key is available, use the AI model.
   * This allows the Copilot to answer both dashboard
   * questions and general questions.
   */
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-5.6',
        input: [
          {
            role: 'system',
            content: `
You are the AI Copilot for a Medical Operations Intelligence Dashboard.

You can answer two types of questions:

1. DASHBOARD QUESTIONS
Use the supplied dashboard data to answer questions about:
- patients
- admissions
- discharges
- doctors
- staff utilization
- revenue
- departments
- insurance claims
- denied claims
- pharmacy inventory
- medicines
- waiting time
- no-shows
- operational trends
- locations
- hospital performance

For dashboard questions:
- Use the supplied data.
- Never invent numbers.
- If the data is insufficient, clearly say so.
- Mention when a number is calculated from the available dataset.

2. GENERAL QUESTIONS
If the user asks a general knowledge or non-dashboard question, answer it normally and clearly.

Important:
- Do not diagnose patients.
- Do not provide clinical treatment instructions.
- Do not pretend that dashboard data exists when it does not.
- Keep answers concise but useful.
- Use ₹ for Indian currency when appropriate.
- Use bullet points when they make the answer easier to understand.
`
          },
          {
            role: 'user',
            content: `
Dashboard data:

${JSON.stringify(context)}

User question:

${question}
`
          }
        ]
      });

      return {
        answer: response.output_text,
        source: 'OpenAI'
      };
    } catch (error) {
      console.error('OpenAI error:', error.message);

      /*
       * If OpenAI fails, continue using the local analytics engine
       * instead of breaking the Copilot.
       */
      return demoAnswer(question, context);
    }
  }

  /*
   * No API key:
   * Use the built-in analytics engine.
   */
  return demoAnswer(question, context);
}

function demoAnswer(q, c) {
  const l = q.toLowerCase();

  // -----------------------------
  // PATIENTS
  // -----------------------------

  if (
    l.includes('how many patients') ||
    l.includes('total patients') ||
    l.includes('number of patients')
  ) {
    return {
      answer: `The dashboard currently contains ${c.patients.length.toLocaleString(
        'en-IN'
      )} patient records.`,
      source: 'Demo analytics'
    };
  }

  if (l.includes('admitted') || l.includes('admissions')) {
    const admitted = c.patients.filter(
      p => p.status === 'Admitted'
    ).length;

    return {
      answer: `There are currently ${admitted.toLocaleString(
        'en-IN'
      )} admitted patients in the available dataset.`,
      source: 'Demo analytics'
    };
  }

  if (l.includes('discharged')) {
    const discharged = c.patients.filter(
      p => p.status === 'Discharged'
    ).length;

    return {
      answer: `There are ${discharged.toLocaleString(
        'en-IN'
      )} discharged patient records in the available dataset.`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // WAITING TIME
  // -----------------------------

  if (
    l.includes('wait') ||
    l.includes('waiting time') ||
    l.includes('longest wait')
  ) {
    const waits = c.patients
      .map(p => Number(p.waitMinutes))
      .filter(n => Number.isFinite(n));

    if (!waits.length) {
      return {
        answer: 'Waiting-time data is not available in the current dataset.',
        source: 'Demo analytics'
      };
    }

    const average =
      waits.reduce((a, b) => a + b, 0) / waits.length;

    const maximum = Math.max(...waits);

    return {
      answer: `The average recorded waiting time is approximately ${Math.round(
        average
      )} minutes, with the longest recorded wait at ${maximum} minutes.`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // NO-SHOWS
  // -----------------------------

  if (
    l.includes('no show') ||
    l.includes('no-show') ||
    l.includes('noshow')
  ) {
    const noShows = c.patients.filter(p => p.noShow === true).length;

    return {
      answer: `There are ${noShows.toLocaleString(
        'en-IN'
      )} patient records marked as no-shows.`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // REVENUE
  // -----------------------------

  if (
    l.includes('revenue') ||
    l.includes('income') ||
    l.includes('earnings')
  ) {
    const total = c.revenue.reduce(
      (sum, r) => sum + Number(r.revenue || 0),
      0
    );

    return {
      answer: `The available revenue records total approximately ₹${Math.round(
        total
      ).toLocaleString('en-IN')}.`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // LOWEST REVENUE DEPARTMENT
  // -----------------------------

  if (
    l.includes('lowest revenue') ||
    l.includes('least revenue') ||
    l.includes('lowest earning')
  ) {
    const totals = {};

    c.revenue.forEach(r => {
      const department = r.department || 'Unknown';

      totals[department] =
        (totals[department] || 0) +
        Number(r.revenue || 0);
    });

    const sorted = Object.entries(totals).sort(
      (a, b) => a[1] - b[1]
    );

    if (!sorted.length) {
      return {
        answer: 'Revenue data is not available.',
        source: 'Demo analytics'
      };
    }

    const [department, amount] = sorted[0];

    return {
      answer: `Based on the available revenue data, ${department} has the lowest total revenue at approximately ₹${Math.round(
        amount
      ).toLocaleString('en-IN')}.`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // HIGHEST REVENUE DEPARTMENT
  // -----------------------------

  if (
    l.includes('highest revenue') ||
    l.includes('most revenue') ||
    l.includes('top revenue') ||
    l.includes('highest earning')
  ) {
    const totals = {};

    c.revenue.forEach(r => {
      const department = r.department || 'Unknown';

      totals[department] =
        (totals[department] || 0) +
        Number(r.revenue || 0);
    });

    const sorted = Object.entries(totals).sort(
      (a, b) => b[1] - a[1]
    );

    if (!sorted.length) {
      return {
        answer: 'Revenue data is not available.',
        source: 'Demo analytics'
      };
    }

    const [department, amount] = sorted[0];

    return {
      answer: `${department} has the highest total revenue in the available dataset at approximately ₹${Math.round(
        amount
      ).toLocaleString('en-IN')}.`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // DOCTORS
  // -----------------------------

  if (
    l.includes('how many doctors') ||
    l.includes('number of doctors') ||
    l.includes('total doctors')
  ) {
    return {
      answer: `There are ${c.doctors.length} doctors in the current dashboard dataset.`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // DOCTOR UTILIZATION
  // -----------------------------

  if (
    l.includes('utilization') ||
    l.includes('underutilized') ||
    l.includes('under utilized')
  ) {
    const low = c.doctors.filter(
      d => Number(d.utilization) < 50
    );

    if (!low.length) {
      return {
        answer: 'No doctors are currently below 50% utilization.',
        source: 'Demo analytics'
      };
    }

    return {
      answer: `${low.length} doctors are below 50% utilization. ${low
        .slice(0, 6)
        .map(d => `${d.name} (${d.utilization}%)`)
        .join(', ')}${
        low.length > 6 ? '…' : ''
      }`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // CLAIMS
  // -----------------------------

  if (
    l.includes('claim') ||
    l.includes('insurance')
  ) {
    const denied = c.claims.filter(
      x => x.status === 'Denied'
    ).length;

    const approved = c.claims.filter(
      x => x.status === 'Approved'
    ).length;

    return {
      answer: `The dashboard contains ${c.claims.length} claims: ${approved} approved and ${denied} denied in the available dataset.`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // DENIED CLAIMS
  // -----------------------------

  if (
    l.includes('denied claim') ||
    l.includes('denials') ||
    l.includes('denial')
  ) {
    const denied = c.claims.filter(
      x => x.status === 'Denied'
    ).length;

    const rate = c.claims.length
      ? (denied / c.claims.length) * 100
      : 0;

    return {
      answer: `${denied} claims are denied, representing approximately ${rate.toFixed(
        1
      )}% of the available claims.`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // PHARMACY
  // -----------------------------

  if (
    l.includes('medicine') ||
    l.includes('medicines') ||
    l.includes('pharmacy') ||
    l.includes('inventory')
  ) {
    const low = c.medicines.filter(
      m => Number(m.stock) <= Number(m.reorderLevel)
    );

    return {
      answer: `The pharmacy dataset contains ${c.medicines.length} medicines, with ${low.length} currently at or below their reorder level.`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // LOW STOCK
  // -----------------------------

  if (
    l.includes('low stock') ||
    l.includes('stock') ||
    l.includes('reorder')
  ) {
    const low = c.medicines.filter(
      m => Number(m.stock) <= Number(m.reorderLevel)
    );

    return {
      answer: `${low.length} medicines are currently at or below their reorder level.${
        low.length
          ? ` Examples: ${low
              .slice(0, 5)
              .map(m => `${m.name} (${m.stock})`)
              .join(', ')}.`
          : ''
      }`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // BED / OCCUPANCY
  // -----------------------------

  if (
    l.includes('bed') ||
    l.includes('occupancy')
  ) {
    const admitted = c.patients.filter(
      p => p.status === 'Admitted'
    ).length;

    return {
      answer: `There are currently ${admitted} admitted patients in the available dataset. The current dataset does not contain enough bed-capacity information to calculate a reliable occupancy percentage.`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // DEPARTMENTS
  // -----------------------------

  if (
    l.includes('department') ||
    l.includes('departments')
  ) {
    const departments = [
      ...new Set(
        c.patients
          .map(p => p.department)
          .filter(Boolean)
      )
    ];

    return {
      answer: `The patient data contains these departments: ${departments.join(
        ', '
      )}.`,
      source: 'Demo analytics'
    };
  }

  // -----------------------------
  // GENERAL FALLBACK
  // -----------------------------

  return {
    answer: `I don't have an AI model API key configured, so I can currently answer dashboard questions using the available hospital data. For general questions outside the dashboard, add a valid OPENAI_API_KEY to the server .env file.`,
    source: 'Demo analytics'
  };
}