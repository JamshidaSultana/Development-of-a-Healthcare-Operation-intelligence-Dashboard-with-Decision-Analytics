import { Router } from 'express';
import {
  Patient,
  Revenue,
  Doctor,
  Claim,
  Medicine
} from '../models/index.js';

const r = Router();
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

const LOCATIONS = [
  'Hyderabad',
  'Bengaluru',
  'Chennai',
  'Mumbai',
  'Delhi',
  'Pune'
];

function getDateRange(req) {
  const month = String(req.query.month || '2026-08');

  const parts = month.split('-').map(Number);

  const year = Number.isFinite(parts[0]) ? parts[0] : 2026;
  const monthNumber =
    Number.isFinite(parts[1]) && parts[1] >= 1 && parts[1] <= 12
      ? parts[1]
      : 8;

  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));

  return {
    start,
    end,
    month: `${year}-${String(monthNumber).padStart(2, '0')}`
  };
}

function getLocationFilter(req) {
  const location = String(
    req.query.location || 'All Locations'
  );

  if (
    !location ||
    location === 'All Locations' ||
    location === 'All'
  ) {
    return {};
  }

  return { location };
}

/* ---------------------------------
   LOCATIONS
--------------------------------- */

r.get('/locations', (req, res) => {
  res.json(LOCATIONS);
});

/* ---------------------------------
   DASHBOARD SUMMARY
--------------------------------- */

r.get('/summary', async (req, res) => {
  if (isFutureMonth(req.query.month)) {
  return res.json({
    month: req.query.month,
    patients: 0,
    admissions: 0,
    discharges: 0,
    revenue: 0,
    occupancy: 0,
    staffUtilization: 0,
    denialRate: 0,
    health: 0,
    avgWait: 0,
    lowStock: 0,
    location: req.query.location || 'All Locations',
    upcoming: true
  });
}
  try {
    const { start, end, month } = getDateRange(req);
    const locationFilter = getLocationFilter(req);

    const patientQuery = {
      createdAt: {
        $gte: start,
        $lt: end
      },
      ...locationFilter
    };

    const revenueQuery = {
      date: {
        $gte: start,
        $lt: end
      },
      ...locationFilter
    };

    const claimQuery = {
      submittedAt: {
        $gte: start,
        $lt: end
      },
      ...locationFilter
    };

    const [
      patients,
      revenueResult,
      doctors,
      claims,
      medicines
    ] = await Promise.all([
      Patient.countDocuments(patientQuery),

      Revenue.aggregate([
        {
          $match: revenueQuery
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$revenue'
            }
          }
        }
      ]),

      Doctor.find(locationFilter),

      Claim.find(claimQuery),

      Medicine.find(locationFilter)
    ]);

    const admissions = await Patient.countDocuments({
      ...patientQuery,
      status: 'Admitted'
    });

    const discharges = await Patient.countDocuments({
      ...patientQuery,
      status: 'Discharged'
    });

    const waitResult = await Patient.aggregate([
      {
        $match: patientQuery
      },
      {
        $group: {
          _id: null,
          average: {
            $avg: '$waitMinutes'
          }
        }
      }
    ]);

    const averageWait = Math.round(
      waitResult[0]?.average || 0
    );

    const deniedClaims = claims.filter(
      claim => claim.status === 'Denied'
    ).length;

    const totalClaims = claims.length;

    const denialRate =
      totalClaims > 0
        ? Math.round(
            (deniedClaims / totalClaims) * 100
          )
        : 0;

    const occupancy =
      patients > 0
        ? Math.min(
            99,
            Math.round(
              (admissions / patients) * 100
            )
          )
        : 0;

    const staffUtilization =
      doctors.length > 0
        ? Math.round(
            doctors.reduce(
              (total, doctor) =>
                total + Number(doctor.utilization || 0),
              0
            ) / doctors.length
          )
        : 0;

    const waitScore = Math.max(
      0,
      100 - Math.min(100, averageWait / 3)
    );

    const occupancyScore = 100 - occupancy;

    const claimScore = 100 - denialRate;

    const health = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          occupancyScore * 0.25 +
          staffUtilization * 0.25 +
          claimScore * 0.25 +
          waitScore * 0.25
        )
      )
    );

    const lowStock = medicines.filter(
      medicine =>
        Number(medicine.stock || 0) <=
        Number(medicine.reorderLevel || 0)
    ).length;

    res.json({
      month,

      patients,

      admissions,

      discharges,

      revenue: Math.round(
        revenueResult[0]?.total || 0
      ),

      occupancy,

      staffUtilization,

      denialRate,

      health,

      avgWait: averageWait,

      lowStock,

      location:
        req.query.location ||
        'All Locations'
    });

  } catch (error) {
    console.error(
      'Dashboard summary error:',
      error
    );

    res.status(500).json({
      message: 'Unable to load dashboard summary.',
      error: error.message
    });
  }
});

/* ---------------------------------
   PATIENT VOLUME
--------------------------------- */

r.get('/patient-volume', async (req, res) => {
  try {
    const { start, end } = getDateRange(req);
    const locationFilter = getLocationFilter(req);

    const result = await Patient.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lt: end
          },
          ...locationFilter
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          value: {
            $sum: 1
          }
        }
      },
      {
        $sort: {
          _id: 1
        }
      }
    ]);

    res.json(
      result.map(item => ({
        date: item._id,
        value: item.value
      }))
    );

  } catch (error) {
    console.error(
      'Patient volume error:',
      error
    );

    res.status(500).json({
      message: 'Unable to load patient volume.',
      error: error.message
    });
  }
});

/* ---------------------------------
   REVENUE BY DEPARTMENT
--------------------------------- */

r.get('/revenue-by-department', async (req, res) => {
  try {
    const { start, end } = getDateRange(req);
    const locationFilter = getLocationFilter(req);

    const result = await Revenue.aggregate([
      {
        $match: {
          date: {
            $gte: start,
            $lt: end
          },
          ...locationFilter
        }
      },
      {
        $group: {
          _id: '$department',
          value: {
            $sum: '$revenue'
          }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          value: 1
        }
      },
      {
        $sort: {
          value: -1
        }
      }
    ]);

    res.json(result);

  } catch (error) {
    console.error(
      'Revenue department error:',
      error
    );

    res.status(500).json({
      message: 'Unable to load revenue data.',
      error: error.message
    });
  }
});

/* ---------------------------------
   ANOMALIES
--------------------------------- */

r.get('/anomalies', async (req, res) => {
  try {
    const { start, end } = getDateRange(req);
    const locationFilter = getLocationFilter(req);

    const revenue = await Revenue.aggregate([
      {
        $match: {
          date: {
            $gte: start,
            $lt: end
          },
          ...locationFilter
        }
      },
      {
        $group: {
          _id: '$date',
          value: {
            $sum: '$revenue'
          }
        }
      },
      {
        $sort: {
          _id: -1
        }
      }
    ]);

    const average =
      revenue.reduce(
        (total, item) =>
          total + Number(item.value || 0),
        0
      ) / (revenue.length || 1);

    const anomalies = revenue
      .filter(
        item =>
          item.value < average * 0.7 ||
          item.value > average * 1.3
      )
      .map(item => ({
        date: item._id,
        value: item.value,
        reason:
          item.value > average
            ? 'Unusually high daily revenue'
            : 'Unusually low daily revenue'
      }));

    res.json(anomalies);

  } catch (error) {
    console.error(
      'Anomaly error:',
      error
    );

    res.status(500).json({
      message: 'Unable to load anomalies.',
      error: error.message
    });
  }
});

export default r;