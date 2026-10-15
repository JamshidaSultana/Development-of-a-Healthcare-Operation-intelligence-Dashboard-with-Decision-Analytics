require("dotenv").config();
const { MongoClient } = require("mongodb");

const express = require("express");
const fs = require("fs");
const csv = require("csv-parser");

const app = express();

const PORT = 3000;
const client = new MongoClient(process.env.MONGODB_URI);

// Serve files from the public folder
app.use(express.static("public"));
app.use(
    "/node_modules",
    express.static("node_modules")
);

// ===============================
// TEST API
// ===============================
app.get("/api/test", (req, res) => {
    res.json({ message: "API is working" });
});


// ===============================
// PATIENT VOLUME API - MONGODB
// ===============================

// ===============================
// PATIENT VOLUME API - FILTERED MONGODB
// ===============================
app.get("/api/patient-volume", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const {
            facility,
            department,
            startDate,
            endDate
        } = req.query;

        const match = {};

        // Facility filter
        if (facility) {
            match.facility_name = facility;
        }

        // Department filter
        if (department) {
            match.department_name = department;
        }

        // Date filter
        if (startDate || endDate) {
            match.admission_date = {};

            if (startDate) {
                match.admission_date.$gte = startDate;
            }

            if (endDate) {
                match.admission_date.$lte =
                    endDate + "T23:59:59";
            }
        }

        const data = await db.collection("admissions")
            .aggregate([
                {
                    $match: match
                },
                {
                    $group: {
                        _id: "$department_name",
                        count: {
                            $sum: 1
                        }
                    }
                },
                {
                    $sort: {
                        _id: 1
                    }
                }
            ])
            .toArray();

        const departmentCounts = {};

        data.forEach((item) => {
            if (item._id) {
                departmentCounts[item._id] =
                    item.count;
            }
        });

        res.json(departmentCounts);

    } catch (error) {
        console.error(
            "Filtered patient volume error:",
            error
        );

        res.status(500).json({
            error: "Unable to load filtered patient volume"
        });
    }
});
// ===============================
// REVENUE TREND API - MONGODB
// ===============================
app.get("/api/revenue-trend", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const {
            facility,
            department,
            startDate,
            endDate
        } = req.query;

        const match = {};

        if (facility) {
            match.facility_name = facility;
        }

        if (department) {
            match.department_name = department;
        }

        if (startDate || endDate) {
            match.billing_date = {};

            if (startDate) {
                match.billing_date.$gte = startDate;
            }

            if (endDate) {
                match.billing_date.$lte =
                    endDate + "T23:59:59";
            }
        }

        const data = await db.collection("billing").aggregate([
            {
                $match: match
            },
            {
                $group: {
                    _id: "$billing_date",
                    revenue: {
                        $sum: {
                            $convert: {
                                input: "$invoice_amount",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    }
                }
            },
            {
                $sort: {
                    _id: 1
                }
            }
        ]).toArray();

        const revenueTrend = {};

        data.forEach((item) => {
            if (item._id) {

                const date = new Date(item._id);

                const formattedDate =
                    date.getDate().toString().padStart(2, "0") +
                    "-" +
                    (date.getMonth() + 1).toString().padStart(2, "0") +
                    "-" +
                    date.getFullYear();

                revenueTrend[formattedDate] =
                    item.revenue;
            }
        });

        res.json(revenueTrend);

    } catch (error) {
        console.error(
            "Revenue trend MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read billing collection"
        });
    }
});
// ===============================
// BED OCCUPANCY API - MONGODB
// ===============================
app.get("/api/bed-occupancy", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const {
            facility,
            department,
            startDate,
            endDate
        } = req.query;

        const match = {};

        // Facility filter
        if (facility) {
            match.facility_name = facility;
        }

        // Department filter
        if (department) {
            match.department_name = department;
        }

        // Date filter
        if (startDate || endDate) {
            match.date = {};

            if (startDate) {
                match.date.$gte = startDate;
            }

            if (endDate) {
                match.date.$lte = endDate + "T23:59:59";
            }
        }

        const data = await db.collection("bed_occupancy").aggregate([
            {
                $match: match
            },
            {
                $group: {
                    _id: "$department_name",
                    occupancy: {
                        $avg: {
                            $convert: {
                                input: "$bed_occupancy_rate",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    }
                }
            },
            {
                $sort: {
                    _id: 1
                }
            }
        ]).toArray();

        const occupancyData = {};

        data.forEach((item) => {
            if (item._id) {
                occupancyData[item._id] =
                    Number(item.occupancy.toFixed(2));
            }
        });

        res.json(occupancyData);

    } catch (error) {
        console.error(
            "Bed occupancy MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read bed_occupancy collection"
        });
    }
});
// ===============================
// APPOINTMENT PERFORMANCE API - MONGODB
// ===============================
app.get("/api/appointment-performance", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const {
            facility,
            department,
            startDate,
            endDate
        } = req.query;

        const match = {};

        if (facility) {
            match.facility_name = facility;
        }

        if (department) {
            match.department_name = department;
        }

        if (startDate || endDate) {
            match.appointment_date = {};

            if (startDate) {
                match.appointment_date.$gte =
                    startDate;
            }

            if (endDate) {
                match.appointment_date.$lte =
                    endDate + "T23:59:59";
            }
        }

        console.log(
            "Appointment Performance Filter:",
            match
        );

        const data =
            await db.collection("appointments")
                .aggregate([
                    {
                        $match: match
                    },
                    {
                        $group: {
                            _id: "$department_name",

                            completed: {
                                $sum: {
                                    $cond: [
                                        {
                                            $in: [
                                                "$status",
                                                [
                                                    "Completed",
                                                    "completed"
                                                ]
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            },

                            total: {
                                $sum: 1
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,

                            completionRate: {
                                $cond: [
                                    {
                                        $gt: [
                                            "$total",
                                            0
                                        ]
                                    },
                                    {
                                        $multiply: [
                                            {
                                                $divide: [
                                                    "$completed",
                                                    "$total"
                                                ]
                                            },
                                            100
                                        ]
                                    },
                                    0
                                ]
                            }
                        }
                    },
                    {
                        $sort: {
                            _id: 1
                        }
                    }
                ])
                .toArray();

        const performanceData = {};

        data.forEach((item) => {
            if (item._id) {
                performanceData[item._id] =
                    Number(
                        item.completionRate.toFixed(2)
                    );
            }
        });

        res.json(performanceData);

    } catch (error) {

        console.error(
            "Appointment performance MongoDB error:",
            error
        );

        res.status(500).json({
            error:
                "Unable to read appointments collection"
        });
    }
});
// ===============================
// STAFF UTILIZATION API - MONGODB
// ===============================
app.get("/api/staff-utilization", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const {
            facility,
            department,
            startDate,
            endDate
        } = req.query;

        const match = {};

        // Facility filter
        if (facility) {
            match.facility_name = facility;
        }

        // Date filter
        if (startDate || endDate) {
            match.attendance_date = {};

            if (startDate) {
                match.attendance_date.$gte = startDate;
            }

            if (endDate) {
                match.attendance_date.$lte =
                    endDate + "T23:59:59";
            }
        }

        const data = await db.collection("attendance").aggregate([
            {
                $match: match
            },
            {
                $lookup: {
                    from: "doctors",
                    localField: "doctor_id",
                    foreignField: "doctor_id",
                    as: "doctor"
                }
            },
            {
                $unwind: "$doctor"
            },
            {
                // Department filter is applied after
                // looking up the doctor information
                $match: department
                    ? {
                        "doctor.department_name": department
                    }
                    : {}
            },
            {
                $group: {
                    _id: "$doctor.department_name",

                    totalWorkingHours: {
                        $sum: {
                            $convert: {
                                input: "$working_hours",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    },

                    totalOvertimeHours: {
                        $sum: {
                            $convert: {
                                input: "$overtime_hours",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,

                    utilization: {
                        $cond: [
                            {
                                $gt: [
                                    "$totalWorkingHours",
                                    0
                                ]
                            },
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            "$totalWorkingHours",
                                            {
                                                $add: [
                                                    "$totalWorkingHours",
                                                    "$totalOvertimeHours"
                                                ]
                                            }
                                        ]
                                    },
                                    100
                                ]
                            },
                            0
                        ]
                    }
                }
            },
            {
                $sort: {
                    _id: 1
                }
            }
        ]).toArray();

        const utilizationData = {};

        data.forEach((item) => {
            if (item._id) {
                utilizationData[item._id] =
                    Number(
                        item.utilization.toFixed(2)
                    );
            }
        });

        res.json(utilizationData);

    } catch (error) {
        console.error(
            "Staff utilization MongoDB error:",
            error
        );

        res.status(500).json({
            error:
                "Unable to read attendance and doctors collections"
        });
    }
});

app.get("/api/executive-kpis", async (req, res) => {
    try {
        const db = client.db("HospitalDB");
        const { facility, department } = req.query;

        // Apply the selected filters to each relevant collection.
        const admissionsMatch = {};
        const billingMatch = {};
        const appointmentsMatch = {};
        const bedsMatch = {};
        const attendanceMatch = {};

        if (facility) {
            admissionsMatch.facility_name = facility;
            billingMatch.facility_name = facility;
            appointmentsMatch.facility_name = facility;
            bedsMatch.facility_name = facility;
            attendanceMatch.facility_name = facility;
        }

        if (department) {
            admissionsMatch.department_name = department;
            billingMatch.department_name = department;
            appointmentsMatch.department_name = department;
            bedsMatch.department_name = department;
        }

        // Total admissions for the selected filters.
        const totalAdmissions =
            await db.collection("admissions")
                .countDocuments(admissionsMatch);

        // Overall patient count uses the patients collection.
        // Filtered counts use unique patients in matching admissions.
        let totalPatients;

        if (facility || department) {
            const patientResult =
                await db.collection("admissions").aggregate([
                    { $match: admissionsMatch },
                    {
                        $match: {
                            patient_id: {
                                $exists: true,
                                $nin: [null, ""]
                            }
                        }
                    },
                    { $group: { _id: "$patient_id" } },
                    { $count: "totalPatients" }
                ]).toArray();

            totalPatients =
                patientResult.length > 0
                    ? patientResult[0].totalPatients
                    : 0;
        } else {
            totalPatients =
                await db.collection("patients").countDocuments();
        }

        // Average bed occupancy for the selected filters.
        const bedResult =
            await db.collection("bed_occupancy").aggregate([
                { $match: bedsMatch },
                {
                    $group: {
                        _id: null,
                        averageOccupancy: {
                            $avg: {
                                $convert: {
                                    input: "$bed_occupancy_rate",
                                    to: "double",
                                    onError: null,
                                    onNull: null
                                }
                            }
                        }
                    }
                }
            ]).toArray();

        const totalBedOccupancy =
            bedResult.length && bedResult[0].averageOccupancy !== null
                ? Number(bedResult[0].averageOccupancy.toFixed(2))
                : 0;

        // Total invoice revenue for the selected filters.
        const revenueResult =
            await db.collection("billing").aggregate([
                { $match: billingMatch },
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: {
                                $convert: {
                                    input: "$invoice_amount",
                                    to: "double",
                                    onError: 0,
                                    onNull: 0
                                }
                            }
                        }
                    }
                }
            ]).toArray();

        const totalRevenue =
            revenueResult.length
                ? revenueResult[0].totalRevenue
                : 0;

        // Patient flow = admissions with a discharge date / all admissions.
        const dischargedAdmissions =
            await db.collection("admissions").countDocuments({
                ...admissionsMatch,
                discharge_date: {
                    $exists: true,
                    $nin: [null, ""]
                }
            });

        const patientFlow =
            totalAdmissions > 0
                ? Number(
                    ((dischargedAdmissions / totalAdmissions) * 100).toFixed(2)
                )
                : 0;

        // Appointment completion rate.
        const totalAppointments =
            await db.collection("appointments")
                .countDocuments(appointmentsMatch);

        const completedAppointments =
            await db.collection("appointments").countDocuments({
                ...appointmentsMatch,
                status: { $regex: /^completed$/i }
            });

        const appointmentCompletion =
            totalAppointments > 0
                ? Number(
                    ((completedAppointments / totalAppointments) * 100).toFixed(2)
                )
                : 0;

        // Staff utilization, using attendance and doctor department details.
        const attendancePipeline = [
            { $match: attendanceMatch },
            {
                $lookup: {
                    from: "doctors",
                    localField: "doctor_id",
                    foreignField: "doctor_id",
                    as: "doctor"
                }
            },
            { $unwind: "$doctor" }
        ];

        if (department) {
            attendancePipeline.push({
                $match: {
                    "doctor.department_name": department
                }
            });
        }

        attendancePipeline.push({
            $group: {
                _id: null,
                workingHours: {
                    $sum: {
                        $convert: {
                            input: "$working_hours",
                            to: "double",
                            onError: 0,
                            onNull: 0
                        }
                    }
                },
                overtimeHours: {
                    $sum: {
                        $convert: {
                            input: "$overtime_hours",
                            to: "double",
                            onError: 0,
                            onNull: 0
                        }
                    }
                }
            }
        });

        const staffResult =
            await db.collection("attendance")
                .aggregate(attendancePipeline)
                .toArray();

        const workingHours =
            staffResult.length ? staffResult[0].workingHours : 0;

        const overtimeHours =
            staffResult.length ? staffResult[0].overtimeHours : 0;

        const staffUtilization =
            workingHours + overtimeHours > 0
                ? Number(
                    (
                        (workingHours / (workingHours + overtimeHours)) * 100
                    ).toFixed(2)
                )
                : 0;

        // Claims processing rate: approved or rejected claims / identified claims.
        const claimsMatch = {
            ...billingMatch,
            claim_id: { $exists: true, $nin: [null, ""] }
        };

        const totalClaims =
            await db.collection("billing")
                .countDocuments(claimsMatch);

        const processedClaims =
            await db.collection("billing").countDocuments({
                ...claimsMatch,
                claim_status: { $regex: /^(approved|rejected)$/i }
            });

        const claimsProcessing =
            totalClaims > 0
                ? Number(
                    ((processedClaims / totalClaims) * 100).toFixed(2)
                )
                : 0;

        res.json({
            totalPatients,
            totalAdmissions,
            totalBedOccupancy,
            totalRevenue,
            patientFlow,
            appointmentCompletion,
            staffUtilization,
            claimsProcessing
        });

    } catch (error) {
        console.error("Executive KPI API error:", error);

        res.status(500).json({
            error: "Unable to load filtered executive KPIs"
        });
    }
});

// ===============================
// START SERVER
// ===============================
app.get("/api/total-patients", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const totalPatients = await db
            .collection("patients")
            .countDocuments();

        res.json({
            totalPatients: totalPatients
        });

    } catch (error) {
        console.error("Total patients MongoDB error:", error);

        res.status(500).json({
            error: "Unable to read patients collection"
        });
    }
});
app.get("/api/total-admissions", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const totalAdmissions = await db
            .collection("admissions")
            .countDocuments();

        res.json({
            totalAdmissions: totalAdmissions
        });

    } catch (error) {
        console.error("Total admissions MongoDB error:", error);

        res.status(500).json({
            error: "Unable to read admission collection"
        });
    }
});  
app.get("/api/total-bed-occupancy", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const result = await db
            .collection("bed_occupancy")
            .aggregate([
                {
                    $group: {
                        _id: null,
                        averageOccupancy: {
                            $avg: "$bed_occupancy_rate"
                        }
                    }
                }
            ])
            .toArray();

        const totalBedOccupancy =
            result.length > 0
                ? Number(result[0].averageOccupancy.toFixed(2))
                : 0;

        res.json({
            totalBedOccupancy
        });

    } catch (error) {
        console.error("Bed occupancy MongoDB error:", error);

        res.status(500).json({
            error: "Unable to read bed occupancy collection"
        });
    }
});
app.get("/api/total-revenue", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const result = await db
            .collection("billing")
            .aggregate([
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: "$invoice_amount"
                        }
                    }
                }
            ])
            .toArray();

        const totalRevenue =
            result.length > 0
                ? result[0].totalRevenue
                : 0;

        res.json({
            totalRevenue
        });

    } catch (error) {
        console.error("Revenue MongoDB error:", error);

        res.status(500).json({
            error: "Unable to read billing collection"
        });
    }
});
app.get("/api/appointment-completion", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const totalAppointments =
            await db.collection("appointments").countDocuments();

        const completedAppointments =
            await db.collection("appointments").countDocuments({
                status: "Completed"
            });

        const completionRate =
            totalAppointments > 0
                ? (completedAppointments / totalAppointments) * 100
                : 0;

        res.json({
            completionRate: Number(completionRate.toFixed(2))
        });

    } catch (error) {
        console.error(
            "Appointment completion MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read appointments collection"
        });
    }
});
// =====================================================
// PATIENT OPERATIONS - MONGODB APIs
// =====================================================

// 1. Total Appointments
app.get("/api/patient-total-appointments", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const totalAppointments =
            await db.collection("appointments").countDocuments();

        res.json({
            totalAppointments
        });

    } catch (error) {
        console.error("Total appointments MongoDB error:", error);

        res.status(500).json({
            error: "Unable to read appointments collection"
        });
    }
});


// 2. Appointment Completion
app.get("/api/patient-appointment-completion", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const totalAppointments =
            await db.collection("appointments").countDocuments();

        const completedAppointments =
            await db.collection("appointments").countDocuments({
                status: {
                    $regex: /^completed$/i
                }
            });

        const completionRate =
            totalAppointments > 0
                ? (completedAppointments / totalAppointments) * 100
                : 0;

        res.json({
            completionRate: Number(completionRate.toFixed(2))
        });

    } catch (error) {
        console.error(
            "Appointment completion MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read appointments collection"
        });
    }
});


// 3. Average Waiting Time
app.get("/api/patient-average-waiting", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const result = await db
            .collection("appointments")
            .aggregate([
                {
                    $group: {
                        _id: null,
                        averageWaiting: {
                            $avg: {
                                $convert: {
                                    input: "$waiting_time_minutes",
                                    to: "double",
                                    onError: null,
                                    onNull: null
                                }
                            }
                        }
                    }
                }
            ])
            .toArray();

        const averageWaiting =
            result.length > 0 &&
            result[0].averageWaiting !== null
                ? result[0].averageWaiting
                : 0;

        res.json({
            averageWaiting: Number(
                averageWaiting.toFixed(2)
            )
        });

    } catch (error) {
        console.error(
            "Average waiting MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read appointments collection"
        });
    }
});


// 4. No-Show Rate
app.get("/api/patient-no-show-rate", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const totalAppointments =
            await db.collection("appointments").countDocuments();

        const noShowAppointments =
            await db.collection("appointments").countDocuments({
                status: {
                    $regex: /^no-show$/i
                }
            });

        const noShowRate =
            totalAppointments > 0
                ? (noShowAppointments / totalAppointments) * 100
                : 0;

        res.json({
            noShowRate: Number(
                noShowRate.toFixed(2)
            )
        });

    } catch (error) {
        console.error(
            "No-show rate MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read appointments collection"
        });
    }
});

/* =====================================================
   PATIENT OPERATIONS - FILTERED KPI API
===================================================== */

app.get("/api/patient-kpis", async (req, res) => {
    try {
        const db = client.db("HospitalDB");
        const { facility, department } = req.query;

        // Apply Facility and Department filters to appointments.
        const match = {};

        if (facility) {
            match.facility_name = facility;
        }

        if (department) {
            match.department_name = department;
        }

        const appointments = db.collection("appointments");

        // Total appointments for the selected filters.
        const totalAppointments =
            await appointments.countDocuments(match);

        // Completed appointments for the selected filters.
        const completedAppointments =
            await appointments.countDocuments({
                ...match,
                status: { $regex: /^completed$/i }
            });

        const appointmentCompletion =
            totalAppointments > 0
                ? Number(
                    ((completedAppointments / totalAppointments) * 100).toFixed(2)
                )
                : 0;

        // Average waiting time for the selected filters.
        const waitingResult = await appointments.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    averageWaitingTime: {
                        $avg: {
                            $convert: {
                                input: "$waiting_time_minutes",
                                to: "double",
                                onError: null,
                                onNull: null
                            }
                        }
                    }
                }
            }
        ]).toArray();

        const averageWaitingTime =
            waitingResult.length &&
            waitingResult[0].averageWaitingTime !== null
                ? Number(
                    waitingResult[0].averageWaitingTime.toFixed(2)
                )
                : 0;

        // No-show appointments for the selected filters.
        const noShowAppointments =
            await appointments.countDocuments({
                ...match,
                status: { $regex: /^no[\s-]?show$/i }
            });

        const noShowRate =
            totalAppointments > 0
                ? Number(
                    ((noShowAppointments / totalAppointments) * 100).toFixed(2)
                )
                : 0;

        // Property names match patient-operations.html.
        res.json({
            totalAppointments,
            appointmentCompletion,
            averageWaitingTime,
            noShowRate
        });

    } catch (error) {
        console.error("Patient Operations KPI API error:", error);

        res.status(500).json({
            error: "Unable to load filtered Patient Operations KPIs"
        });
    }
});



// =====================================================
// PATIENT OPERATIONS - FILTERED CHART APIs
// =====================================================


// =====================================================
// 5. PATIENT VOLUME BY DEPARTMENT
// =====================================================

app.get(
    "/api/patient-operations-volume",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const {
                facility,
                department,
                startDate,
                endDate
            } = req.query;

            const match = {
                department_name: {
                    $exists: true,
                    $ne: ""
                }
            };


            // Facility filter
            if (facility) {

                match.facility_name =
                    facility;

            }


            // Department filter
            if (department) {

                match.department_name =
                    department;

            }


            // Date filter
            if (startDate || endDate) {

                match.admission_date = {};

                if (startDate) {

                    match.admission_date.$gte =
                        startDate;

                }

                if (endDate) {

                    match.admission_date.$lte =
                        endDate + "T23:59:59";

                }

            }


            const data =
                await db
                    .collection("admissions")
                    .aggregate([

                        {
                            $match:
                                match
                        },

                        {
                            $group: {

                                _id:
                                    "$department_name",

                                count: {
                                    $sum: 1
                                }

                            }
                        },

                        {
                            $sort: {
                                _id: 1
                            }
                        }

                    ])
                    .toArray();


            const result = {};


            data.forEach(item => {

                if (item._id) {

                    result[item._id] =
                        item.count;

                }

            });


            res.json(result);

        }
        catch (error) {

            console.error(
                "Patient volume error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to load patient volume"

            });

        }

    }
);


// =====================================================
// 6. APPOINTMENT STATUS
// =====================================================

app.get(
    "/api/patient-appointment-status",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const {
                facility,
                department,
                startDate,
                endDate
            } = req.query;


            const match = {

                status: {
                    $exists: true,
                    $ne: ""
                }

            };


            // Facility
            if (facility) {

                match.facility_name =
                    facility;

            }


            // Department
            if (department) {

                match.department_name =
                    department;

            }


            // Date
            if (startDate || endDate) {

                match.appointment_date = {};

                if (startDate) {

                    match.appointment_date.$gte =
                        startDate;

                }

                if (endDate) {

                    match.appointment_date.$lte =
                        endDate + "T23:59:59";

                }

            }


            const result =
                await db
                    .collection("appointments")
                    .aggregate([

                        {
                            $match:
                                match
                        },

                        {
                            $group: {

                                _id:
                                    "$status",

                                count: {
                                    $sum: 1
                                }

                            }
                        },

                        {
                            $sort: {
                                _id: 1
                            }
                        }

                    ])
                    .toArray();


            const statusCounts = {};


            result.forEach(item => {

                if (item._id) {

                    statusCounts[item._id] =
                        item.count;

                }

            });


            res.json(statusCounts);

        }
        catch (error) {

            console.error(
                "Appointment status error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to load appointment status"

            });

        }

    }
);


// =====================================================
// 7. AVERAGE WAITING TIME BY DEPARTMENT
// =====================================================

app.get(
    "/api/patient-waiting-department",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const {
                facility,
                department,
                startDate,
                endDate
            } = req.query;


            const match = {

                department_name: {
                    $exists: true,
                    $ne: ""
                }

            };


            // Facility
            if (facility) {

                match.facility_name =
                    facility;

            }


            // Department
            if (department) {

                match.department_name =
                    department;

            }


            // Date
            if (startDate || endDate) {

                match.appointment_date = {};

                if (startDate) {

                    match.appointment_date.$gte =
                        startDate;

                }

                if (endDate) {

                    match.appointment_date.$lte =
                        endDate + "T23:59:59";

                }

            }


            const result =
                await db
                    .collection("appointments")
                    .aggregate([

                        {
                            $match:
                                match
                        },

                        {
                            $group: {

                                _id:
                                    "$department_name",

                                averageWaiting: {

                                    $avg: {

                                        $convert: {

                                            input:
                                                "$waiting_time_minutes",

                                            to:
                                                "double",

                                            onError:
                                                null,

                                            onNull:
                                                null

                                        }

                                    }

                                }

                            }
                        },

                        {
                            $sort: {
                                _id: 1
                            }
                        }

                    ])
                    .toArray();


            const finalData = {};


            result.forEach(item => {

                if (item._id) {

                    finalData[item._id] =
                        item.averageWaiting !== null
                            ? Number(
                                item.averageWaiting
                                    .toFixed(2)
                            )
                            : 0;

                }

            });


            res.json(finalData);

        }
        catch (error) {

            console.error(
                "Waiting department error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to load waiting time"

            });

        }

    }
);


// =====================================================
// 8. ADMISSIONS TREND
// =====================================================

app.get(
    "/api/patient-admissions-trend",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const {
                facility,
                department,
                startDate,
                endDate
            } = req.query;


            const match = {

                admission_date: {
                    $exists: true,
                    $ne: ""
                }

            };


            // Facility
            if (facility) {

                match.facility_name =
                    facility;

            }


            // Department
            if (department) {

                match.department_name =
                    department;

            }


            // Date
            if (startDate || endDate) {

                match.admission_date = {};

                if (startDate) {

                    match.admission_date.$gte =
                        startDate;

                }

                if (endDate) {

                    match.admission_date.$lte =
                        endDate + "T23:59:59";

                }

            }


            const result =
                await db
                    .collection("admissions")
                    .aggregate([

                        {
                            $match:
                                match
                        },

                        {
                            $group: {

                                _id:
                                    "$admission_date",

                                count: {
                                    $sum: 1
                                }

                            }
                        },

                        {
                            $sort: {
                                _id: 1
                            }
                        }

                    ])
                    .toArray();


            const admissionsByDate = {};


            result.forEach(item => {

                const date =
                    String(item._id)
                        .split("T")[0];


                admissionsByDate[date] =
                    (
                        admissionsByDate[date] ||
                        0
                    ) + item.count;

            });


            res.json(admissionsByDate);

        }
        catch (error) {

            console.error(
                "Admissions trend error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to load admissions trend"

            });

        }

    }
);


// =====================================================
// 9. BED OCCUPANCY BY DEPARTMENT
// =====================================================

app.get(
    "/api/patient-bed-occupancy",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const {
                facility,
                department,
                startDate,
                endDate
            } = req.query;


            const match = {

                department_name: {
                    $exists: true,
                    $ne: ""
                }

            };


            // Facility
            if (facility) {

                match.facility_name =
                    facility;

            }


            // Department
            if (department) {

                match.department_name =
                    department;

            }


            /*
             * Bed occupancy currently uses
             * department/facility filtering.
             *
             * Date filtering is applied only
             * when the database field "date"
             * exists.
             */

            if (startDate || endDate) {

                match.date = {};

                if (startDate) {

                    match.date.$gte =
                        startDate;

                }

                if (endDate) {

                    match.date.$lte =
                        endDate;

                }

            }


            const result =
                await db
                    .collection("bed_occupancy")
                    .aggregate([

                        {
                            $match:
                                match
                        },

                        {
                            $group: {

                                _id:
                                    "$department_name",

                                averageOccupancy: {

                                    $avg: {

                                        $convert: {

                                            input:
                                                "$bed_occupancy_rate",

                                            to:
                                                "double",

                                            onError:
                                                null,

                                            onNull:
                                                null

                                        }

                                    }

                                }

                            }
                        },

                        {
                            $sort: {
                                _id: 1
                            }
                        }

                    ])
                    .toArray();


            const finalData = {};


            result.forEach(item => {

                if (item._id) {

                    finalData[item._id] =
                        item.averageOccupancy !== null
                            ? Number(
                                item.averageOccupancy
                                    .toFixed(2)
                            )
                            : 0;

                }

            });


            res.json(finalData);

        }
        catch (error) {

            console.error(
                "Bed occupancy error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to load bed occupancy"

            });

        }

    }
);
// =====================================================
// DOCTOR & STAFF INTELLIGENCE - MONGODB APIs
// =====================================================


// =====================================================
// DOCTOR & STAFF FILTERS
// =====================================================

// Facility filter
app.get("/api/doctor-staff-facilities", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const facilities =
            await db.collection("department_facilities")
                .distinct("facility_name");

        res.json(
            facilities
                .filter(Boolean)
                .sort()
        );

    } catch (error) {

        console.error(
            "Doctor Staff facility filter error:",
            error
        );

        res.status(500).json({
            error: "Unable to load facilities"
        });
    }
});


// Department filter
app.get("/api/doctor-staff-departments", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const departments =
            await db.collection("department_facilities")
                .distinct("department_name");

        res.json(
            departments
                .filter(Boolean)
                .sort()
        );

    } catch (error) {

        console.error(
            "Doctor Staff department filter error:",
            error
        );

        res.status(500).json({
            error: "Unable to load departments"
        });
    }
});


// =====================================================
// 1. TOTAL DOCTORS
// =====================================================

app.get("/api/doctor-total", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const {
            facility,
            department
        } = req.query;

        const match = {};

        if (facility) {
            match.facility_name = facility;
        }

        if (department) {
            match.department_name = department;
        }

        const totalDoctors =
            await db.collection("doctors")
                .countDocuments(match);

        res.json({
            totalDoctors
        });

    } catch (error) {

        console.error(
            "Total doctors MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read doctors collection"
        });
    }
});


// =====================================================
// 2. TOTAL STAFF
// =====================================================

app.get("/api/staff-total", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const {
            facility,
            department
        } = req.query;

        const match = {};

        if (facility) {
            match.facility_name = facility;
        }

        if (department) {
            match.department_name = department;
        }

        const totalStaff =
            await db.collection("staff")
                .countDocuments(match);

        res.json({
            totalStaff
        });

    } catch (error) {

        console.error(
            "Total staff MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read staff collection"
        });
    }
});


// =====================================================
// 3. AVERAGE DOCTOR EXPERIENCE
// =====================================================

app.get("/api/doctor-average-experience", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const {
            facility,
            department
        } = req.query;

        const match = {};

        if (facility) {
            match.facility_name = facility;
        }

        if (department) {
            match.department_name = department;
        }

        const result =
            await db.collection("doctors")
                .aggregate([

                    {
                        $match: match
                    },

                    {
                        $group: {

                            _id: null,

                            averageExperience: {

                                $avg: {

                                    $convert: {

                                        input:
                                            "$experience_years",

                                        to: "double",

                                        onError: null,

                                        onNull: null

                                    }
                                }
                            }
                        }
                    }

                ])
                .toArray();

        const averageExperience =
            result.length > 0 &&
            result[0].averageExperience !== null
                ? result[0].averageExperience
                : 0;

        res.json({

            averageExperience:
                Number(
                    averageExperience.toFixed(2)
                )

        });

    } catch (error) {

        console.error(
            "Doctor experience MongoDB error:",
            error
        );

        res.status(500).json({

            error:
                "Unable to read doctors collection"

        });
    }
});


// =====================================================
// 4. DOCTOR ATTENDANCE RATE
// =====================================================

app.get("/api/staff-attendance", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const {
            facility,
            department
        } = req.query;


        const match = {};


        if (facility) {

            match["attendance.facility_name"] =
                facility;

        }


        if (department) {

            match["doctor.department_name"] =
                department;

        }


        const result =
            await db.collection("attendance")
                .aggregate([

                    // Connect attendance to doctor
                    {
                        $lookup: {

                            from: "doctors",

                            localField:
                                "doctor_id",

                            foreignField:
                                "doctor_id",

                            as: "doctor"

                        }
                    },

                    {
                        $unwind: {

                            path: "$doctor",

                            preserveNullAndEmptyArrays:
                                false

                        }
                    },


                    // Create filter fields
                    {
                        $addFields: {

                            "attendance.facility_name":
                                "$facility_name",

                            "doctor.department_name":
                                "$doctor.department_name"

                        }
                    },


                    {
                        $match: match
                    },


                    {
                        $group: {

                            _id: null,

                            totalRecords: {
                                $sum: 1
                            },

                            presentRecords: {

                                $sum: {

                                    $cond: [

                                        {
                                            $regexMatch: {

                                                input:
                                                    "$attendance_status",

                                                regex:
                                                    /^present$/i

                                            }
                                        },

                                        1,

                                        0

                                    ]
                                }
                            }
                        }
                    }

                ])
                .toArray();


        if (!result.length) {

            return res.json({
                attendanceRate: 0
            });

        }


        const totalRecords =
            result[0].totalRecords;

        const presentRecords =
            result[0].presentRecords;


        const attendanceRate =
            totalRecords > 0

                ? (
                    presentRecords /
                    totalRecords
                ) * 100

                : 0;


        res.json({

            attendanceRate:
                Number(
                    attendanceRate.toFixed(2)
                )

        });

    } catch (error) {

        console.error(
            "Attendance MongoDB error:",
            error
        );

        res.status(500).json({

            error:
                "Unable to read attendance collection"

        });
    }
});


// =====================================================
// 5. DOCTORS BY DEPARTMENT
// =====================================================

app.get("/api/doctors-by-department", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const {
            facility,
            department
        } = req.query;

        const match = {

            department_name: {

                $exists: true,

                $ne: ""

            }

        };


        if (facility) {

            match.facility_name =
                facility;

        }


        if (department) {

            match.department_name =
                department;

        }


        const result =
            await db.collection("doctors")
                .aggregate([

                    {
                        $match: match
                    },

                    {
                        $group: {

                            _id:
                                "$department_name",

                            count: {
                                $sum: 1
                            }

                        }
                    }

                ])
                .toArray();


        const departmentCounts = {};


        result.forEach((item) => {

            departmentCounts[item._id] =
                item.count;

        });


        res.json(departmentCounts);

    } catch (error) {

        console.error(
            "Doctors by department MongoDB error:",
            error
        );

        res.status(500).json({

            error:
                "Unable to read doctors collection"

        });
    }
});


// =====================================================
// 6. STAFF BY DEPARTMENT
// =====================================================

app.get("/api/staff-by-department", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const {
            facility,
            department
        } = req.query;

        const match = {

            department_name: {

                $exists: true,

                $ne: ""

            }

        };


        if (facility) {

            match.facility_name =
                facility;

        }


        if (department) {

            match.department_name =
                department;

        }


        const result =
            await db.collection("staff")
                .aggregate([

                    {
                        $match: match
                    },

                    {
                        $group: {

                            _id:
                                "$department_name",

                            count: {
                                $sum: 1
                            }

                        }
                    }

                ])
                .toArray();


        const departmentCounts = {};


        result.forEach((item) => {

            departmentCounts[item._id] =
                item.count;

        });


        res.json(departmentCounts);

    } catch (error) {

        console.error(
            "Staff by department MongoDB error:",
            error
        );

        res.status(500).json({

            error:
                "Unable to read staff collection"

        });
    }
});


// =====================================================
// 7. DOCTOR EXPERIENCE DISTRIBUTION
// =====================================================

app.get("/api/doctor-experience", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const {
            facility,
            department
        } = req.query;

        const match = {};


        if (facility) {

            match.facility_name =
                facility;

        }


        if (department) {

            match.department_name =
                department;

        }


        const result =
            await db.collection("doctors")
                .aggregate([

                    {
                        $match: match
                    },

                    {
                        $project: {

                            experience: {

                                $convert: {

                                    input:
                                        "$experience_years",

                                    to: "double",

                                    onError: null,

                                    onNull: null

                                }
                            }

                        }
                    },


                    {
                        $match: {

                            experience: {
                                $ne: null
                            }

                        }
                    },


                    {
                        $group: {

                            _id: {

                                $switch: {

                                    branches: [

                                        {

                                            case: {

                                                $lte: [

                                                    "$experience",

                                                    5

                                                ]

                                            },

                                            then:
                                                "0-5 Years"

                                        },

                                        {

                                            case: {

                                                $lte: [

                                                    "$experience",

                                                    10

                                                ]

                                            },

                                            then:
                                                "6-10 Years"

                                        },

                                        {

                                            case: {

                                                $lte: [

                                                    "$experience",

                                                    15

                                                ]

                                            },

                                            then:
                                                "11-15 Years"

                                        },

                                        {

                                            case: {

                                                $lte: [

                                                    "$experience",

                                                    20

                                                ]

                                            },

                                            then:
                                                "16-20 Years"

                                        }

                                    ],

                                    default:
                                        "21+ Years"

                                }

                            },

                            count: {
                                $sum: 1
                            }

                        }
                    }

                ])
                .toArray();


        const experienceGroups = {

            "0-5 Years": 0,

            "6-10 Years": 0,

            "11-15 Years": 0,

            "16-20 Years": 0,

            "21+ Years": 0

        };


        result.forEach((item) => {

            experienceGroups[item._id] =
                item.count;

        });


        res.json(experienceGroups);

    } catch (error) {

        console.error(
            "Doctor experience MongoDB error:",
            error
        );

        res.status(500).json({

            error:
                "Unable to read doctors collection"

        });
    }
});


// =====================================================
// 8. ATTENDANCE STATUS
// =====================================================

app.get("/api/attendance-status", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const {
            facility,
            department
        } = req.query;


        const result =
            await db.collection("attendance")
                .aggregate([

                    {
                        $lookup: {

                            from: "doctors",

                            localField:
                                "doctor_id",

                            foreignField:
                                "doctor_id",

                            as: "doctor"

                        }
                    },


                    {
                        $unwind: "$doctor"
                    },


                    {
                        $match: {

                            ...(facility
                                ? {
                                    facility_name:
                                        facility
                                }
                                : {}),

                            ...(department
                                ? {
                                    "doctor.department_name":
                                        department
                                }
                                : {}),

                            attendance_status: {

                                $exists: true,

                                $ne: ""

                            }

                        }

                    },


                    {
                        $group: {

                            _id:
                                "$attendance_status",

                            count: {
                                $sum: 1
                            }

                        }
                    }

                ])
                .toArray();


        const statusCounts = {};


        result.forEach((item) => {

            statusCounts[item._id] =
                item.count;

        });


        res.json(statusCounts);

    } catch (error) {

        console.error(
            "Attendance status MongoDB error:",
            error
        );

        res.status(500).json({

            error:
                "Unable to read attendance collection"

        });
    }
});


// =====================================================
// 9. WORKING HOURS BY DEPARTMENT
// =====================================================

app.get("/api/working-hours-department", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const {
            facility,
            department
        } = req.query;

        const match = {};

        if (facility) {
            match.facility_name = facility;
        }

        if (department) {
            match["doctor.department_name"] = department;
        }

        const result =
            await db.collection("attendance")
                .aggregate([

                    {
                        $lookup: {
                            from: "doctors",
                            localField: "doctor_id",
                            foreignField: "doctor_id",
                            as: "doctor"
                        }
                    },

                    {
                        $unwind: "$doctor"
                    },

                    {
                        $match: match
                    },

                    {
                        $group: {

                            _id:
                                "$doctor.department_name",

                            averageWorkingHours: {

                                $avg: {

                                    $convert: {

                                        input:
                                            "$working_hours",

                                        to: "double",

                                        onError: null,

                                        onNull: null

                                    }

                                }

                            }

                        }

                    }

                ])
                .toArray();


        const finalData = {};

        result.forEach((item) => {

            finalData[item._id] =
                item.averageWorkingHours !== null
                    ? Number(
                        item.averageWorkingHours.toFixed(2)
                    )
                    : 0;

        });


        res.json(finalData);

    }
    catch (error) {

        console.error(
            "Working hours MongoDB error:",
            error
        );

        res.status(500).json({

            error:
                "Unable to read attendance/doctors collections"

        });

    }

});


// =====================================================
// BILLING & REVENUE INTELLIGENCE - MONGODB APIs
// =====================================================


// =====================================================
// BILLING FILTERS
// =====================================================

// 1. Billing Facilities

app.get("/api/billing-facilities", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const facilities =
            await db.collection("billing")
                .distinct("facility_name");

        res.json(
            facilities
                .filter(Boolean)
                .sort()
        );

    }
    catch (error) {

        console.error(
            "Billing facilities error:",
            error
        );

        res.status(500).json({
            error: "Unable to load billing facilities"
        });

    }

});


// 2. Billing Departments

app.get("/api/billing-departments", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const departments =
            await db.collection("billing")
                .distinct("department_name");

        res.json(
            departments
                .filter(Boolean)
                .sort()
        );

    }
    catch (error) {

        console.error(
            "Billing departments error:",
            error
        );

        res.status(500).json({
            error: "Unable to load billing departments"
        });

    }

});


// =====================================================
// COMMON BILLING FILTER
// =====================================================

function getBillingMatch(req) {

    const {
        facility,
        department
    } = req.query;

    const match = {};

    if (facility) {

        match.facility_name =
            facility;

    }

    if (department) {

        match.department_name =
            department;

    }

    return match;

}


// =====================================================
// 3. TOTAL REVENUE
// =====================================================

app.get("/api/billing-total-revenue", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const match =
            getBillingMatch(req);

        const result =
            await db.collection("billing")
                .aggregate([

                    {
                        $match: match
                    },

                    {
                        $group: {

                            _id: null,

                            totalRevenue: {

                                $sum: {

                                    $convert: {

                                        input:
                                            "$invoice_amount",

                                        to: "double",

                                        onError: 0,

                                        onNull: 0

                                    }

                                }

                            }

                        }

                    }

                ])
                .toArray();


        const totalRevenue =
            result.length > 0
                ? result[0].totalRevenue
                : 0;


        res.json({

            totalRevenue:
                Number(
                    totalRevenue.toFixed(2)
                )

        });

    }
    catch (error) {

        console.error(
            "Billing total revenue MongoDB error:",
            error
        );

        res.status(500).json({
            error:
                "Unable to read billing collection"
        });

    }

});


// =====================================================
// 4. OUTSTANDING AMOUNT
// =====================================================

app.get("/api/billing-outstanding", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const match =
            getBillingMatch(req);

        const result =
            await db.collection("billing")
                .aggregate([

                    {
                        $match: match
                    },

                    {
                        $group: {

                            _id: null,

                            outstanding:
                                {

                                    $sum: {

                                        $convert: {

                                            input:
                                                "$outstanding_amount",

                                            to: "double",

                                            onError: 0,

                                            onNull: 0

                                        }

                                    }

                                }

                        }

                    }

                ])
                .toArray();


        const outstanding =
            result.length > 0
                ? result[0].outstanding
                : 0;


        res.json({

            outstanding:
                Number(
                    outstanding.toFixed(2)
                )

        });

    }
    catch (error) {

        console.error(
            "Billing outstanding MongoDB error:",
            error
        );

        res.status(500).json({
            error:
                "Unable to read billing collection"
        });

    }

});


// =====================================================
// 5. INSURANCE AMOUNT
// =====================================================

app.get("/api/billing-insurance", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const match =
            getBillingMatch(req);

        const result =
            await db.collection("billing")
                .aggregate([

                    {
                        $match: match
                    },

                    {
                        $group: {

                            _id: null,

                            insuranceAmount:
                                {

                                    $sum: {

                                        $convert: {

                                            input:
                                                "$insurance_amount",

                                            to: "double",

                                            onError: 0,

                                            onNull: 0

                                        }

                                    }

                                }

                        }

                    }

                ])
                .toArray();


        const insuranceAmount =
            result.length > 0
                ? result[0].insuranceAmount
                : 0;


        res.json({

            insuranceAmount:
                Number(
                    insuranceAmount.toFixed(2)
                )

        });

    }
    catch (error) {

        console.error(
            "Billing insurance MongoDB error:",
            error
        );

        res.status(500).json({
            error:
                "Unable to read billing collection"
        });

    }

});


// =====================================================
// 6. PATIENT PAYMENTS
// =====================================================

app.get("/api/billing-patient-payment", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const match =
            getBillingMatch(req);

        const result =
            await db.collection("billing")
                .aggregate([

                    {
                        $match: match
                    },

                    {
                        $group: {

                            _id: null,

                            patientPayment:
                                {

                                    $sum: {

                                        $convert: {

                                            input:
                                                "$patient_payment",

                                            to: "double",

                                            onError: 0,

                                            onNull: 0

                                        }

                                    }

                                }

                        }

                    }

                ])
                .toArray();


        const patientPayment =
            result.length > 0
                ? result[0].patientPayment
                : 0;


        res.json({

            patientPayment:
                Number(
                    patientPayment.toFixed(2)
                )

        });

    }
    catch (error) {

        console.error(
            "Billing patient payment MongoDB error:",
            error
        );

        res.status(500).json({
            error:
                "Unable to read billing collection"
        });

    }

});


// =====================================================
// 7. REVENUE BY DEPARTMENT
// =====================================================

app.get(
    "/api/billing-department-revenue",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const match =
                getBillingMatch(req);

            match.department_name = {
                $exists: true,
                $ne: ""
            };


            const result =
                await db.collection("billing")
                    .aggregate([

                        {
                            $match: match
                        },

                        {
                            $group: {

                                _id:
                                    "$department_name",

                                revenue: {

                                    $sum: {

                                        $convert: {

                                            input:
                                                "$invoice_amount",

                                            to: "double",

                                            onError: 0,

                                            onNull: 0

                                        }

                                    }

                                }

                            }

                        },

                        {
                            $sort: {
                                revenue: -1
                            }
                        }

                    ])
                    .toArray();


            const departmentRevenue = {};


            result.forEach((item) => {

                departmentRevenue[item._id] =
                    Number(
                        item.revenue.toFixed(2)
                    );

            });


            res.json(
                departmentRevenue
            );

        }
        catch (error) {

            console.error(
                "Billing department revenue MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to read billing collection"
            });

        }

    }
);


// =====================================================
// 8. REVENUE TREND
// =====================================================

app.get(
    "/api/billing-revenue-trend",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const match =
                getBillingMatch(req);

            match.billing_date = {
                $exists: true,
                $ne: ""
            };


            const result =
                await db.collection("billing")
                    .aggregate([

                        {
                            $match: match
                        },

                        {
                            $group: {

                                _id:
                                    "$billing_date",

                                revenue: {

                                    $sum: {

                                        $convert: {

                                            input:
                                                "$invoice_amount",

                                            to: "double",

                                            onError: 0,

                                            onNull: 0

                                        }

                                    }

                                }

                            }

                        },

                        {
                            $sort: {
                                _id: 1
                            }
                        }

                    ])
                    .toArray();


            const revenueTrend = {};


            result.forEach((item) => {

                const date =
                    String(item._id)
                        .split("T")[0];


                revenueTrend[date] =
                    Number(
                        (
                            revenueTrend[date] || 0
                        ) +
                        item.revenue
                    );

            });


            Object.keys(revenueTrend)
                .forEach((date) => {

                    revenueTrend[date] =
                        Number(
                            revenueTrend[date]
                                .toFixed(2)
                        );

                });


            res.json(
                revenueTrend
            );

        }
        catch (error) {

            console.error(
                "Billing revenue trend MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to read billing collection"
            });

        }

    }
);


// =====================================================
// 9. PAYMENT STATUS
// =====================================================

app.get(
    "/api/billing-payment-status",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const match =
                getBillingMatch(req);

            match.payment_status = {
                $exists: true,
                $ne: ""
            };


            const result =
                await db.collection("billing")
                    .aggregate([

                        {
                            $match: match
                        },

                        {
                            $group: {

                                _id:
                                    "$payment_status",

                                count: {
                                    $sum: 1
                                }

                            }

                        }

                    ])
                    .toArray();


            const paymentStatus = {};


            result.forEach((item) => {

                paymentStatus[item._id] =
                    item.count;

            });


            res.json(
                paymentStatus
            );

        }
        catch (error) {

            console.error(
                "Billing payment status MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to read billing collection"
            });

        }

    }
);


// =====================================================
// 10. OUTSTANDING BY DEPARTMENT
// =====================================================

app.get(
    "/api/billing-outstanding-department",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const match =
                getBillingMatch(req);

            match.department_name = {
                $exists: true,
                $ne: ""
            };


            const result =
                await db.collection("billing")
                    .aggregate([

                        {
                            $match: match
                        },

                        {
                            $group: {

                                _id:
                                    "$department_name",

                                outstanding: {

                                    $sum: {

                                        $convert: {

                                            input:
                                                "$outstanding_amount",

                                            to: "double",

                                            onError: 0,

                                            onNull: 0

                                        }

                                    }

                                }

                            }

                        },

                        {
                            $sort: {
                                outstanding: -1
                            }
                        }

                    ])
                    .toArray();


            const outstandingByDepartment = {};


            result.forEach((item) => {

                outstandingByDepartment[item._id] =
                    Number(
                        item.outstanding.toFixed(2)
                    );

            });


            res.json(
                outstandingByDepartment
            );

        }
        catch (error) {

            console.error(
                "Billing outstanding department MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to read billing collection"
            });

        }

    }
);


// =====================================================
// 11. PAYMENT METHOD DISTRIBUTION
// =====================================================

app.get(
    "/api/billing-payment-method",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const match =
                getBillingMatch(req);

            match.payment_method = {
                $exists: true,
                $ne: ""
            };


            const result =
                await db.collection("billing")
                    .aggregate([

                        {
                            $match: match
                        },

                        {
                            $group: {

                                _id:
                                    "$payment_method",

                                count: {
                                    $sum: 1
                                }

                            }

                        }

                    ])
                    .toArray();


            const paymentMethods = {};


            result.forEach((item) => {

                paymentMethods[item._id] =
                    item.count;

            });


            res.json(
                paymentMethods
            );

        }
        catch (error) {

            console.error(
                "Billing payment method MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to read billing collection"
            });

        }

    }
);

/* =====================================================
   INSURANCE & CLAIMS AUTOMATION - MONGODB APIs
===================================================== */


// =====================================================
// INSURANCE & CLAIMS FILTERS
// =====================================================


// 1. INSURANCE FACILITIES

app.get("/api/insurance-facilities", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const facilities =
            await db.collection("billing")
                .distinct("facility_name");

        res.json(
            facilities
                .filter(Boolean)
                .sort()
        );

    }
    catch (error) {

        console.error(
            "Insurance facilities error:",
            error
        );

        res.status(500).json({
            error: "Unable to load insurance facilities"
        });

    }

});


// 2. INSURANCE DEPARTMENTS

app.get("/api/insurance-departments", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const departments =
            await db.collection("billing")
                .distinct("department_name");

        res.json(
            departments
                .filter(Boolean)
                .sort()
        );

    }
    catch (error) {

        console.error(
            "Insurance departments error:",
            error
        );

        res.status(500).json({
            error: "Unable to load insurance departments"
        });

    }

});


// =====================================================
// COMMON INSURANCE CLAIMS FILTER
// =====================================================

function getInsuranceClaimsMatch(req) {

    const {
        facility,
        department
    } = req.query;

    const match = {};

    if (facility) {

        match.facility_name =
            facility;

    }

    if (department) {

        match.department_name =
            department;

    }

    return match;

}


// =====================================================
// 3. INSURANCE KPIs
// =====================================================

app.get("/api/insurance-kpis", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const match =
            getInsuranceClaimsMatch(req);

        const result =
            await db.collection("billing")
                .aggregate([

                    {
                        $match: match
                    },

                    {
                        $group: {

                            _id: null,

                            totalInsurance: {

                                $sum: {

                                    $convert: {

                                        input:
                                            "$insurance_amount",

                                        to: "double",

                                        onError: 0,

                                        onNull: 0

                                    }

                                }

                            },

                            totalInvoice: {

                                $sum: {

                                    $convert: {

                                        input:
                                            "$invoice_amount",

                                        to: "double",

                                        onError: 0,

                                        onNull: 0

                                    }

                                }

                            },

                            totalClaims: {

                                $sum: {

                                    $cond: [

                                        {
                                            $and: [

                                                {
                                                    $ne: [
                                                        "$claim_id",
                                                        null
                                                    ]
                                                },

                                                {
                                                    $ne: [
                                                        "$claim_id",
                                                        ""
                                                    ]
                                                }

                                            ]
                                        },

                                        1,

                                        0

                                    ]

                                }

                            },

                            pendingClaims: {

                                $sum: {

                                    $cond: [

                                        {
                                            $regexMatch: {

                                                input: {
                                                    $ifNull: [
                                                        "$claim_status",
                                                        ""
                                                    ]
                                                },

                                                regex:
                                                    /^pending$/i

                                            }

                                        },

                                        1,

                                        0

                                    ]

                                }

                            },

                            approvedClaims: {

                                $sum: {

                                    $cond: [

                                        {
                                            $regexMatch: {

                                                input: {
                                                    $ifNull: [
                                                        "$claim_status",
                                                        ""
                                                    ]
                                                },

                                                regex:
                                                    /^approved$/i

                                            }

                                        },

                                        1,

                                        0

                                    ]

                                }

                            },

                            rejectedClaims: {

                                $sum: {

                                    $cond: [

                                        {
                                            $regexMatch: {

                                                input: {
                                                    $ifNull: [
                                                        "$claim_status",
                                                        ""
                                                    ]
                                                },

                                                regex:
                                                    /^rejected$/i

                                            }

                                        },

                                        1,

                                        0

                                    ]

                                }

                            },

                            totalProcessingTime: {

                                $sum: {

                                    $cond: [

                                        {
                                            $gt: [

                                                {
                                                    $convert: {

                                                        input:
                                                            "$claim_processing_time_days",

                                                        to: "double",

                                                        onError: 0,

                                                        onNull: 0

                                                    }

                                                },

                                                0

                                            ]

                                        },

                                        {
                                            $convert: {

                                                input:
                                                    "$claim_processing_time_days",

                                                to: "double",

                                                onError: 0,

                                                onNull: 0

                                            }

                                        },

                                        0

                                    ]

                                }

                            },

                            processingCount: {

                                $sum: {

                                    $cond: [

                                        {
                                            $gt: [

                                                {
                                                    $convert: {

                                                        input:
                                                            "$claim_processing_time_days",

                                                        to: "double",

                                                        onError: 0,

                                                        onNull: 0

                                                    }

                                                },

                                                0

                                            ]

                                        },

                                        1,

                                        0

                                    ]

                                }

                            },

                            outstandingInsurance: {

                                $sum: {

                                    $cond: [

                                        {
                                            $gt: [

                                                {
                                                    $convert: {

                                                        input:
                                                            "$insurance_amount",

                                                        to: "double",

                                                        onError: 0,

                                                        onNull: 0

                                                    }

                                                },

                                                0

                                            ]

                                        },

                                        {
                                            $convert: {

                                                input:
                                                    "$outstanding_amount",

                                                to: "double",

                                                onError: 0,

                                                onNull: 0

                                            }

                                        },

                                        0

                                    ]

                                }

                            }

                        }

                    }

                ])
                .toArray();


        const data =
            result.length > 0
                ? result[0]
                : {};


        const totalInsurance =
            data.totalInsurance || 0;

        const totalInvoice =
            data.totalInvoice || 0;


        const coverageRate =
            totalInvoice > 0
                ? (
                    totalInsurance /
                    totalInvoice
                ) * 100
                : 0;


        const averageProcessingTime =
            (data.processingCount || 0) > 0
                ? data.totalProcessingTime /
                  data.processingCount
                : 0;


        res.json({

            totalInsurance:
                Number(
                    totalInsurance.toFixed(2)
                ),

            coverageRate:
                Number(
                    coverageRate.toFixed(2)
                ),

            totalClaims:
                data.totalClaims || 0,

            pendingClaims:
                data.pendingClaims || 0,

            approvedClaims:
                data.approvedClaims || 0,

            rejectedClaims:
                data.rejectedClaims || 0,

            averageProcessingTime:
                Number(
                    averageProcessingTime.toFixed(2)
                ),

            outstandingInsurance:
                Number(
                    (
                        data.outstandingInsurance || 0
                    ).toFixed(2)
                )

        });

    }
    catch (error) {

        console.error(
            "Insurance KPIs MongoDB error:",
            error
        );

        res.status(500).json({
            error:
                "Unable to read billing collection"
        });

    }

});


// =====================================================
// 4. INSURANCE AMOUNT BY DEPARTMENT
// =====================================================

app.get(
    "/api/insurance-department",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const match =
                getInsuranceClaimsMatch(req);

            match.department_name = {
                $exists: true,
                $ne: ""
            };


            const result =
                await db.collection("billing")
                    .aggregate([

                        {
                            $match: match
                        },

                        {
                            $group: {

                                _id:
                                    "$department_name",

                                insurance_amount: {

                                    $sum: {

                                        $convert: {

                                            input:
                                                "$insurance_amount",

                                            to: "double",

                                            onError: 0,

                                            onNull: 0

                                        }

                                    }

                                }

                            }

                        },

                        {
                            $sort: {
                                insurance_amount: -1
                            }
                        }

                    ])
                    .toArray();


            const output =
                result.map(item => ({

                    department_name:
                        item._id,

                    insurance_amount:
                        Number(
                            item.insurance_amount.toFixed(2)
                        )

                }));


            res.json(output);

        }
        catch (error) {

            console.error(
                "Insurance department MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to read billing collection"
            });

        }

    }
);


// =====================================================
// 5. INSURANCE TREND
// =====================================================

app.get(
    "/api/insurance-trend",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const match =
                getInsuranceClaimsMatch(req);

            match.billing_date = {
                $exists: true,
                $ne: ""
            };


            const result =
                await db.collection("billing")
                    .aggregate([

                        {
                            $match: match
                        },

                        {
                            $group: {

                                _id:
                                    "$billing_date",

                                insurance_amount: {

                                    $sum: {

                                        $convert: {

                                            input:
                                                "$insurance_amount",

                                            to: "double",

                                            onError: 0,

                                            onNull: 0

                                        }

                                    }

                                }

                            }

                        },

                        {
                            $sort: {
                                _id: 1
                            }
                        }

                    ])
                    .toArray();


            const output =
                result.map(item => ({

                    date:
                        String(item._id)
                            .split("T")[0],

                    insurance_amount:
                        Number(
                            item.insurance_amount.toFixed(2)
                        )

                }));


            res.json(output);

        }
        catch (error) {

            console.error(
                "Insurance trend MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to read billing collection"
            });

        }

    }
);


// =====================================================
// 6. CLAIM STATUS
// =====================================================

app.get(
    "/api/claim-status",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const match =
                getInsuranceClaimsMatch(req);

            match.claim_status = {
                $exists: true,
                $ne: ""
            };


            const result =
                await db.collection("billing")
                    .aggregate([

                        {
                            $match: match
                        },

                        {
                            $group: {

                                _id:
                                    "$claim_status",

                                count: {
                                    $sum: 1
                                }

                            }

                        }

                    ])
                    .toArray();


            const output =
                result.map(item => ({

                    claim_status:
                        item._id,

                    count:
                        item.count

                }));


            res.json(output);

        }
        catch (error) {

            console.error(
                "Claim status MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to read billing collection"
            });

        }

    }
);


// =====================================================
// 7. CLAIM PROCESSING TIME
// =====================================================

app.get(
    "/api/claim-processing",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const match =
                getInsuranceClaimsMatch(req);


            const result =
                await db.collection("billing")
                    .aggregate([

                        {
                            $match: match
                        },

                        {
                            $project: {

                                claim_status: 1,

                                processing_time: {

                                    $convert: {

                                        input:
                                            "$claim_processing_time_days",

                                        to: "double",

                                        onError: null,

                                        onNull: null

                                    }

                                }

                            }

                        },

                        {
                            $match: {

                                claim_status: {
                                    $exists: true,
                                    $ne: ""
                                },

                                processing_time: {
                                    $gt: 0
                                }

                            }

                        },

                        {
                            $group: {

                                _id:
                                    "$claim_status",

                                average_processing_time: {

                                    $avg:
                                        "$processing_time"

                                }

                            }

                        }

                    ])
                    .toArray();


            const output =
                result.map(item => ({

                    claim_status:
                        item._id,

                    average_processing_time:
                        Number(
                            item.average_processing_time
                                .toFixed(2)
                        )

                }));


            res.json(output);

        }
        catch (error) {

            console.error(
                "Claim processing MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to read billing collection"
            });

        }

    }
);


// =====================================================
// 8. INSURANCE VS PATIENT PAYMENT
// =====================================================

app.get(
    "/api/insurance-patient-payment",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const match =
                getInsuranceClaimsMatch(req);

            match.department_name = {
                $exists: true,
                $ne: ""
            };


            const result =
                await db.collection("billing")
                    .aggregate([

                        {
                            $match: match
                        },

                        {
                            $group: {

                                _id:
                                    "$department_name",

                                insurance_amount: {

                                    $sum: {

                                        $convert: {

                                            input:
                                                "$insurance_amount",

                                            to: "double",

                                            onError: 0,

                                            onNull: 0

                                        }

                                    }

                                },

                                patient_payment: {

                                    $sum: {

                                        $convert: {

                                            input:
                                                "$patient_payment",

                                            to: "double",

                                            onError: 0,

                                            onNull: 0

                                        }

                                    }

                                }

                            }

                        }

                    ])
                    .toArray();


            const output =
                result.map(item => ({

                    department_name:
                        item._id,

                    insurance_amount:
                        Number(
                            item.insurance_amount.toFixed(2)
                        ),

                    patient_payment:
                        Number(
                            item.patient_payment.toFixed(2)
                        )

                }));


            res.json(output);

        }
        catch (error) {

            console.error(
                "Insurance patient payment MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to read billing collection"
            });

        }

    }
);


// =====================================================
// 9. INSURANCE AMOUNT BY FACILITY
// =====================================================

app.get(
    "/api/insurance-facility",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const match =
                getInsuranceClaimsMatch(req);

            match.facility_name = {
                $exists: true,
                $ne: ""
            };


            const result =
                await db.collection("billing")
                    .aggregate([

                        {
                            $match: match
                        },

                        {
                            $group: {

                                _id:
                                    "$facility_name",

                                insurance_amount: {

                                    $sum: {

                                        $convert: {

                                            input:
                                                "$insurance_amount",

                                            to: "double",

                                            onError: 0,

                                            onNull: 0

                                        }

                                    }

                                }

                            }

                        },

                        {
                            $sort: {
                                insurance_amount: -1
                            }
                        }

                    ])
                    .toArray();


            const output =
                result.map(item => ({

                    facility_name:
                        item._id,

                    insurance_amount:
                        Number(
                            item.insurance_amount.toFixed(2)
                        )

                }));


            res.json(output);

        }
        catch (error) {

            console.error(
                "Insurance facility MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to read billing collection"
            });

        }

    }
);
/* =====================================================
   AI & PREDICTIVE INTELLIGENCE
   PATIENT DEMAND FORECAST API
===================================================== */

app.get("/api/patient-demand-forecast", (req, res) => {

    const fs = require("fs");
    const csv = require("csv-parser");

    const forecast = [];

    const filePath = "./ai/patient_demand_forecast.csv";

    if (!fs.existsSync(filePath)) {

        return res.status(404).json({
            error: "Patient demand forecast file not found."
        });

    }

    fs.createReadStream(filePath)

        .pipe(csv())

        .on("data", (row) => {

            forecast.push({

                date: row.date,

                predicted_appointments:
                    Number(row.predicted_appointments) || 0

            });

        })

        .on("end", () => {

            res.json(forecast);

        })

        .on("error", (error) => {

            console.error(
                "Patient demand forecast error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to read patient demand forecast."
            });

        });


});

/* =====================================================
   PATIENT EXPERIENCE APIs
   MONGODB + FACILITY + DEPARTMENT FILTERS
===================================================== */

/* =====================================================
   PATIENT EXPERIENCE APIs
   MONGODB + FACILITY + DEPARTMENT FILTERS
===================================================== */


/* =====================================================
   PATIENT EXPERIENCE FILTERS
===================================================== */

app.get(
    "/api/patient-experience-facilities",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const facilities =
                await db
                    .collection("feedback")
                    .distinct("facility_name");

            res.json(
                facilities
                    .filter(value =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                    )
                    .sort()
            );

        } catch (error) {

            console.error(
                "Patient Experience facilities error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load patient experience facilities"
            });

        }

    }
);


app.get(
    "/api/patient-experience-departments",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const departments =
                await db
                    .collection("feedback")
                    .distinct("department_name");

            res.json(
                departments
                    .filter(value =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                    )
                    .sort()
            );

        } catch (error) {

            console.error(
                "Patient Experience departments error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load patient experience departments"
            });

        }

    }
);


/* =====================================================
   FILTER HELPER
===================================================== */

function getPatientExperienceMatch(req) {

    const {
        facility,
        department
    } = req.query;

    const match = {};

    if (facility) {

        match.facility_name =
            facility;

    }

    if (department) {

        match.department_name =
            department;

    }

    return match;

}


/* =====================================================
   PATIENT EXPERIENCE KPIs
===================================================== */

app.get(
    "/api/patient-experience-kpis",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const collection =
                db.collection("feedback");

            const match =
                getPatientExperienceMatch(req);

            const data =
                await collection
                    .find(match)
                    .toArray();


            const ratings =
                data
                    .map(row =>
                        Number(row.rating)
                    )
                    .filter(value =>
                        !isNaN(value)
                    );


            const totalFeedback =
                data.length;


            const averageRating =
                ratings.length > 0
                    ? ratings.reduce(
                        (sum, value) =>
                            sum + value,
                        0
                    ) / ratings.length
                    : 0;


            const positiveFeedback =
                data.filter(row =>
                    String(row.sentiment)
                        .toLowerCase()
                        .includes("positive")
                ).length;


            const negativeFeedback =
                data.filter(row =>
                    String(row.sentiment)
                        .toLowerCase()
                        .includes("negative")
                ).length;


            res.json({

                averageRating:
                    Number(
                        averageRating.toFixed(2)
                    ),

                totalFeedback,

                positiveFeedback,

                negativeFeedback

            });


        } catch (error) {

            console.error(
                "Patient Experience KPI MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load patient experience KPIs"
            });

        }

    }
);


/* =====================================================
   RATING DISTRIBUTION
===================================================== */

app.get(
    "/api/patient-rating-distribution",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const data =
                await db
                    .collection("feedback")
                    .find(
                        getPatientExperienceMatch(req)
                    )
                    .toArray();


            const ratingCounts = {};


            data.forEach(row => {

                const rating =
                    Number(row.rating);

                if (!isNaN(rating)) {

                    ratingCounts[rating] =
                        (
                            ratingCounts[rating] ||
                            0
                        ) + 1;

                }

            });


            const result =
                Object.keys(ratingCounts)
                    .sort(
                        (a, b) =>
                            Number(a) -
                            Number(b)
                    )
                    .map(rating => ({

                        rating:
                            Number(rating),

                        count:
                            ratingCounts[rating]

                    }));


            res.json(result);


        } catch (error) {

            console.error(
                "Patient rating distribution MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load rating distribution"
            });

        }

    }
);


/* =====================================================
   SENTIMENT DISTRIBUTION
===================================================== */

app.get(
    "/api/patient-sentiment",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const data =
                await db
                    .collection("feedback")
                    .find(
                        getPatientExperienceMatch(req)
                    )
                    .toArray();


            const sentimentCounts = {};


            data.forEach(row => {

                const sentiment =
                    String(
                        row.sentiment
                    ).trim();


                if (sentiment) {

                    sentimentCounts[
                        sentiment
                    ] =
                        (
                            sentimentCounts[
                                sentiment
                            ] || 0
                        ) + 1;

                }

            });


            const result =
                Object.keys(
                    sentimentCounts
                ).map(sentiment => ({

                    sentiment,

                    count:
                        sentimentCounts[
                            sentiment
                        ]

                }));


            res.json(result);


        } catch (error) {

            console.error(
                "Patient sentiment MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load sentiment distribution"
            });

        }

    }
);


/* =====================================================
   RATING BY DEPARTMENT
===================================================== */

app.get(
    "/api/patient-rating-department",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const data =
                await db
                    .collection("feedback")
                    .find(
                        getPatientExperienceMatch(req)
                    )
                    .toArray();


            const departments = {};


            data.forEach(row => {

                const department =
                    row.department_name;

                const rating =
                    Number(row.rating);


                if (
                    department &&
                    !isNaN(rating)
                ) {

                    if (
                        !departments[
                            department
                        ]
                    ) {

                        departments[
                            department
                        ] = [];

                    }


                    departments[
                        department
                    ].push(rating);

                }

            });


            const result =
                Object.keys(
                    departments
                ).map(department => {

                    const values =
                        departments[
                            department
                        ];


                    const average =
                        values.reduce(
                            (sum, value) =>
                                sum + value,
                            0
                        ) / values.length;


                    return {

                        department,

                        average_rating:
                            Number(
                                average.toFixed(2)
                            )

                    };

                });


            res.json(result);


        } catch (error) {

            console.error(
                "Patient department rating MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load department ratings"
            });

        }

    }
);


/* =====================================================
   RATING BY FACILITY
===================================================== */

app.get(
    "/api/patient-rating-facility",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const data =
                await db
                    .collection("feedback")
                    .find(
                        getPatientExperienceMatch(req)
                    )
                    .toArray();


            const facilities = {};


            data.forEach(row => {

                const facility =
                    row.facility_name;

                const rating =
                    Number(row.rating);


                if (
                    facility &&
                    !isNaN(rating)
                ) {

                    if (
                        !facilities[
                            facility
                        ]
                    ) {

                        facilities[
                            facility
                        ] = [];

                    }


                    facilities[
                        facility
                    ].push(rating);

                }

            });


            const result =
                Object.keys(
                    facilities
                ).map(facility => {

                    const values =
                        facilities[
                            facility
                        ];


                    const average =
                        values.reduce(
                            (sum, value) =>
                                sum + value,
                            0
                        ) / values.length;


                    return {

                        facility,

                        average_rating:
                            Number(
                                average.toFixed(2)
                            )

                    };

                });


            res.json(result);


        } catch (error) {

            console.error(
                "Patient facility rating MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load facility ratings"
            });

        }

    }
);


/* =====================================================
   FEEDBACK TREND
===================================================== */

app.get(
    "/api/patient-feedback-trend",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const data =
                await db
                    .collection("feedback")
                    .find(
                        getPatientExperienceMatch(req)
                    )
                    .toArray();


            const monthly = {};


            data.forEach(row => {

                const date =
                    new Date(
                        row.feedback_date
                    );


                if (
                    isNaN(
                        date.getTime()
                    )
                ) {

                    return;

                }


                const month =
                    date
                        .toISOString()
                        .substring(0, 7);


                monthly[month] =
                    (
                        monthly[month] ||
                        0
                    ) + 1;

            });


            const result =
                Object.keys(monthly)
                    .sort()
                    .map(month => ({

                        month,

                        count:
                            monthly[month]

                    }));


            res.json(result);


        } catch (error) {

            console.error(
                "Patient feedback trend MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load feedback trend"
            });

        }

    }
);


/* =====================================================
   FEEDBACK TYPE
===================================================== */

app.get(
    "/api/patient-feedback-type",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const data =
                await db
                    .collection("feedback")
                    .find(
                        getPatientExperienceMatch(req)
                    )
                    .toArray();


            const typeCounts = {};


            data.forEach(row => {

                const type =
                    String(
                        row.feedback_type
                    ).trim();


                if (type) {

                    typeCounts[type] =
                        (
                            typeCounts[type] ||
                            0
                        ) + 1;

                }

            });


            const result =
                Object.keys(
                    typeCounts
                ).map(type => ({

                    feedback_type:
                        type,

                    count:
                        typeCounts[type]

                }));


            res.json(result);


        } catch (error) {

            console.error(
                "Patient feedback type MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load feedback type"
            });

        }

    }
);
/* =====================================================
   PATIENT EXPERIENCE FILTERS
===================================================== */

app.get(
    "/api/patient-experience-facilities",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const facilities =
                await db
                    .collection("feedback")
                    .distinct("facility_name");

            res.json(
                facilities
                    .filter(value =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                    )
                    .sort()
            );

        } catch (error) {

            console.error(
                "Patient Experience facilities error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load patient experience facilities"
            });

        }

    }
);


app.get(
    "/api/patient-experience-departments",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const departments =
                await db
                    .collection("feedback")
                    .distinct("department_name");

            res.json(
                departments
                    .filter(value =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                    )
                    .sort()
            );

        } catch (error) {

            console.error(
                "Patient Experience departments error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load patient experience departments"
            });

        }

    }
);


/* =====================================================
   FILTER HELPER
===================================================== */

function getPatientExperienceMatch(req) {

    const {
        facility,
        department
    } = req.query;

    const match = {};

    if (facility) {

        match.facility_name =
            facility;

    }

    if (department) {

        match.department_name =
            department;

    }

    return match;

}


/* =====================================================
   PATIENT EXPERIENCE KPIs
===================================================== */

app.get(
    "/api/patient-experience-kpis",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const collection =
                db.collection("feedback");

            const match =
                getPatientExperienceMatch(req);

            const data =
                await collection
                    .find(match)
                    .toArray();


            const ratings =
                data
                    .map(row =>
                        Number(row.rating)
                    )
                    .filter(value =>
                        !isNaN(value)
                    );


            const totalFeedback =
                data.length;


            const averageRating =
                ratings.length > 0
                    ? ratings.reduce(
                        (sum, value) =>
                            sum + value,
                        0
                    ) / ratings.length
                    : 0;


            const positiveFeedback =
                data.filter(row =>
                    String(row.sentiment)
                        .toLowerCase()
                        .includes("positive")
                ).length;


            const negativeFeedback =
                data.filter(row =>
                    String(row.sentiment)
                        .toLowerCase()
                        .includes("negative")
                ).length;


            res.json({

                averageRating:
                    Number(
                        averageRating.toFixed(2)
                    ),

                totalFeedback,

                positiveFeedback,

                negativeFeedback

            });


        } catch (error) {

            console.error(
                "Patient Experience KPI MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load patient experience KPIs"
            });

        }

    }
);


/* =====================================================
   RATING DISTRIBUTION
===================================================== */

app.get(
    "/api/patient-rating-distribution",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const data =
                await db
                    .collection("feedback")
                    .find(
                        getPatientExperienceMatch(req)
                    )
                    .toArray();


            const ratingCounts = {};


            data.forEach(row => {

                const rating =
                    Number(row.rating);

                if (!isNaN(rating)) {

                    ratingCounts[rating] =
                        (
                            ratingCounts[rating] ||
                            0
                        ) + 1;

                }

            });


            const result =
                Object.keys(ratingCounts)
                    .sort(
                        (a, b) =>
                            Number(a) -
                            Number(b)
                    )
                    .map(rating => ({

                        rating:
                            Number(rating),

                        count:
                            ratingCounts[rating]

                    }));


            res.json(result);


        } catch (error) {

            console.error(
                "Patient rating distribution MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load rating distribution"
            });

        }

    }
);


/* =====================================================
   SENTIMENT DISTRIBUTION
===================================================== */

app.get(
    "/api/patient-sentiment",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const data =
                await db
                    .collection("feedback")
                    .find(
                        getPatientExperienceMatch(req)
                    )
                    .toArray();


            const sentimentCounts = {};


            data.forEach(row => {

                const sentiment =
                    String(
                        row.sentiment
                    ).trim();


                if (sentiment) {

                    sentimentCounts[
                        sentiment
                    ] =
                        (
                            sentimentCounts[
                                sentiment
                            ] || 0
                        ) + 1;

                }

            });


            const result =
                Object.keys(
                    sentimentCounts
                ).map(sentiment => ({

                    sentiment,

                    count:
                        sentimentCounts[
                            sentiment
                        ]

                }));


            res.json(result);


        } catch (error) {

            console.error(
                "Patient sentiment MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load sentiment distribution"
            });

        }

    }
);


/* =====================================================
   RATING BY DEPARTMENT
===================================================== */

app.get(
    "/api/patient-rating-department",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const data =
                await db
                    .collection("feedback")
                    .find(
                        getPatientExperienceMatch(req)
                    )
                    .toArray();


            const departments = {};


            data.forEach(row => {

                const department =
                    row.department_name;

                const rating =
                    Number(row.rating);


                if (
                    department &&
                    !isNaN(rating)
                ) {

                    if (
                        !departments[
                            department
                        ]
                    ) {

                        departments[
                            department
                        ] = [];

                    }


                    departments[
                        department
                    ].push(rating);

                }

            });


            const result =
                Object.keys(
                    departments
                ).map(department => {

                    const values =
                        departments[
                            department
                        ];


                    const average =
                        values.reduce(
                            (sum, value) =>
                                sum + value,
                            0
                        ) / values.length;


                    return {

                        department,

                        average_rating:
                            Number(
                                average.toFixed(2)
                            )

                    };

                });


            res.json(result);


        } catch (error) {

            console.error(
                "Patient department rating MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load department ratings"
            });

        }

    }
);


/* =====================================================
   RATING BY FACILITY
===================================================== */

app.get(
    "/api/patient-rating-facility",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const data =
                await db
                    .collection("feedback")
                    .find(
                        getPatientExperienceMatch(req)
                    )
                    .toArray();


            const facilities = {};


            data.forEach(row => {

                const facility =
                    row.facility_name;

                const rating =
                    Number(row.rating);


                if (
                    facility &&
                    !isNaN(rating)
                ) {

                    if (
                        !facilities[
                            facility
                        ]
                    ) {

                        facilities[
                            facility
                        ] = [];

                    }


                    facilities[
                        facility
                    ].push(rating);

                }

            });


            const result =
                Object.keys(
                    facilities
                ).map(facility => {

                    const values =
                        facilities[
                            facility
                        ];


                    const average =
                        values.reduce(
                            (sum, value) =>
                                sum + value,
                            0
                        ) / values.length;


                    return {

                        facility,

                        average_rating:
                            Number(
                                average.toFixed(2)
                            )

                    };

                });


            res.json(result);


        } catch (error) {

            console.error(
                "Patient facility rating MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load facility ratings"
            });

        }

    }
);


/* =====================================================
   FEEDBACK TREND
===================================================== */

app.get(
    "/api/patient-feedback-trend",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const data =
                await db
                    .collection("feedback")
                    .find(
                        getPatientExperienceMatch(req)
                    )
                    .toArray();


            const monthly = {};


            data.forEach(row => {

                const date =
                    new Date(
                        row.feedback_date
                    );


                if (
                    isNaN(
                        date.getTime()
                    )
                ) {

                    return;

                }


                const month =
                    date
                        .toISOString()
                        .substring(0, 7);


                monthly[month] =
                    (
                        monthly[month] ||
                        0
                    ) + 1;

            });


            const result =
                Object.keys(monthly)
                    .sort()
                    .map(month => ({

                        month,

                        count:
                            monthly[month]

                    }));


            res.json(result);


        } catch (error) {

            console.error(
                "Patient feedback trend MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load feedback trend"
            });

        }

    }
);


/* =====================================================
   FEEDBACK TYPE
===================================================== */

app.get(
    "/api/patient-feedback-type",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const data =
                await db
                    .collection("feedback")
                    .find(
                        getPatientExperienceMatch(req)
                    )
                    .toArray();


            const typeCounts = {};


            data.forEach(row => {

                const type =
                    String(
                        row.feedback_type
                    ).trim();


                if (type) {

                    typeCounts[type] =
                        (
                            typeCounts[type] ||
                            0
                        ) + 1;

                }

            });


            const result =
                Object.keys(
                    typeCounts
                ).map(type => ({

                    feedback_type:
                        type,

                    count:
                        typeCounts[type]

                }));


            res.json(result);


        } catch (error) {

            console.error(
                "Patient feedback type MongoDB error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load feedback type"
            });

        }

    }
);
// ===============================
// PATIENT EXPERIENCE KPIs
// ===============================

app.get("/api/patient-experience-kpis", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const result = await db.collection("feedback").aggregate([

            {
                $group: {
                    _id: null,

                    totalFeedback: {
                        $sum: 1
                    },

                    averageRating: {
                        $avg: {
                            $convert: {
                                input: "$rating",
                                to: "double",
                                onError: null,
                                onNull: null
                            }
                        }
                    },

                    positiveFeedback: {
                        $sum: {
                            $cond: [
                                {
                                    $regexMatch: {
                                        input: {
                                            $toString: "$sentiment"
                                        },
                                        regex: "positive",
                                        options: "i"
                                    }
                                },
                                1,
                                0
                            ]
                        }
                    },

                    negativeFeedback: {
                        $sum: {
                            $cond: [
                                {
                                    $regexMatch: {
                                        input: {
                                            $toString: "$sentiment"
                                        },
                                        regex: "negative",
                                        options: "i"
                                    }
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }

        ]).toArray();

        const data = result[0] || {};

        res.json({

            averageRating:
                Number(
                    (data.averageRating || 0).toFixed(2)
                ),

            totalFeedback:
                data.totalFeedback || 0,

            positiveFeedback:
                data.positiveFeedback || 0,

            negativeFeedback:
                data.negativeFeedback || 0

        });

    } catch (error) {

        console.error(
            "Patient Experience KPI MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read feedback collection"
        });

    }

});


// ===============================
// RATING DISTRIBUTION
// ===============================

app.get("/api/patient-rating-distribution", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const result = await db.collection("feedback").aggregate([

            {
                $project: {
                    rating: {
                        $convert: {
                            input: "$rating",
                            to: "double",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },

            {
                $match: {
                    rating: {
                        $ne: null
                    }
                }
            },

            {
                $group: {
                    _id: "$rating",
                    count: {
                        $sum: 1
                    }
                }
            },

            {
                $sort: {
                    _id: 1
                }
            }

        ]).toArray();

        res.json(

            result.map(row => ({

                rating: row._id,

                count: row.count

            }))

        );

    } catch (error) {

        console.error(
            "Rating distribution MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read rating distribution"
        });

    }

});


// ===============================
// SENTIMENT DISTRIBUTION
// ===============================

app.get("/api/patient-sentiment", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const result = await db.collection("feedback").aggregate([

            {
                $project: {
                    sentiment: {
                        $trim: {
                            input: {
                                $toString: "$sentiment"
                            }
                        }
                    }
                }
            },

            {
                $match: {
                    sentiment: {
                        $ne: ""
                    }
                }
            },

            {
                $group: {
                    _id: "$sentiment",
                    count: {
                        $sum: 1
                    }
                }
            },

            {
                $sort: {
                    count: -1
                }
            }

        ]).toArray();

        res.json(

            result.map(row => ({

                sentiment: row._id,

                count: row.count

            }))

        );

    } catch (error) {

        console.error(
            "Sentiment MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read sentiment data"
        });

    }

});


// ===============================
// RATING BY DEPARTMENT
// ===============================

app.get("/api/patient-rating-department", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const result = await db.collection("feedback").aggregate([

            {
                $project: {

                    department: {
                        $trim: {
                            input: {
                                $toString: "$department_name"
                            }
                        }
                    },

                    rating: {
                        $convert: {
                            input: "$rating",
                            to: "double",
                            onError: null,
                            onNull: null
                        }
                    }

                }
            },

            {
                $match: {

                    department: {
                        $ne: ""
                    },

                    rating: {
                        $ne: null
                    }

                }
            },

            {
                $group: {

                    _id: "$department",

                    average_rating: {
                        $avg: "$rating"
                    }

                }
            },

            {
                $sort: {
                    average_rating: -1
                }
            }

        ]).toArray();

        res.json(

            result.map(row => ({

                department: row._id,

                average_rating:
                    Number(
                        row.average_rating.toFixed(2)
                    )

            }))

        );

    } catch (error) {

        console.error(
            "Department rating MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read department ratings"
        });

    }

});


// ===============================
// RATING BY FACILITY
// ===============================

app.get("/api/patient-rating-facility", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const result = await db.collection("feedback").aggregate([

            {
                $project: {

                    facility: {
                        $trim: {
                            input: {
                                $toString: "$facility_name"
                            }
                        }
                    },

                    rating: {
                        $convert: {
                            input: "$rating",
                            to: "double",
                            onError: null,
                            onNull: null
                        }
                    }

                }
            },

            {
                $match: {

                    facility: {
                        $ne: ""
                    },

                    rating: {
                        $ne: null
                    }

                }
            },

            {
                $group: {

                    _id: "$facility",

                    average_rating: {
                        $avg: "$rating"
                    }

                }
            },

            {
                $sort: {
                    average_rating: -1
                }
            }

        ]).toArray();

        res.json(

            result.map(row => ({

                facility: row._id,

                average_rating:
                    Number(
                        row.average_rating.toFixed(2)
                    )

            }))

        );

    } catch (error) {

        console.error(
            "Facility rating MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read facility ratings"
        });

    }

});


// ===============================
// FEEDBACK TREND
// ===============================

app.get("/api/patient-feedback-trend", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const result = await db.collection("feedback").aggregate([

            {
                $project: {

                    feedback_date: 1

                }
            },

            {
                $match: {

                    feedback_date: {
                        $ne: null
                    }

                }
            },

            {
                $addFields: {

                    parsedDate: {
                        $convert: {
                            input: "$feedback_date",
                            to: "date",
                            onError: null,
                            onNull: null
                        }
                    }

                }
            },

            {
                $match: {

                    parsedDate: {
                        $ne: null
                    }

                }

            },

            {
                $group: {

                    _id: {
                        $dateToString: {
                            format: "%Y-%m",
                            date: "$parsedDate"
                        }
                    },

                    count: {
                        $sum: 1
                    }

                }

            },

            {
                $sort: {
                    _id: 1
                }
            }

        ]).toArray();

        res.json(

            result.map(row => ({

                month: row._id,

                count: row.count

            }))

        );

    } catch (error) {

        console.error(
            "Feedback trend MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read feedback trend"
        });

    }

});


// ===============================
// FEEDBACK TYPE
// ===============================

app.get("/api/patient-feedback-type", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const result = await db.collection("feedback").aggregate([

            {
                $project: {

                    feedback_type: {
                        $trim: {
                            input: {
                                $toString: "$feedback_type"
                            }
                        }
                    }

                }
            },

            {
                $match: {

                    feedback_type: {
                        $ne: ""
                    }

                }

            },

            {
                $group: {

                    _id: "$feedback_type",

                    count: {
                        $sum: 1
                    }

                }

            },

            {
                $sort: {
                    count: -1
                }

            }

        ]).toArray();

        res.json(

            result.map(row => ({

                feedback_type: row._id,

                count: row.count

            }))

        );

    } catch (error) {

        console.error(
            "Feedback type MongoDB error:",
            error
        );

        res.status(500).json({
            error: "Unable to read feedback types"
        });

    }

});
// PHARMACY & INVENTORY API
// MONGODB VERSION
// FILTERED VERSION
// ===============================


// ======================================================
// PHARMACY FILTER - FACILITIES
// ======================================================

app.get("/api/pharmacy-facilities", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const collection =
            db.collection("pharmacy_inventory");

        const facilities =
            await collection.distinct("Facility_Name");

        res.json(
            facilities
                .filter(value =>
                    value !== null &&
                    value !== undefined &&
                    String(value).trim() !== ""
                )
                .sort()
        );

    }

    catch (error) {

        console.error(
            "Pharmacy facility filter error:",
            error
        );

        res.status(500).json({
            error: "Unable to load pharmacy facilities"
        });

    }

});


// ======================================================
// PHARMACY FILTER - DEPARTMENTS
// ======================================================

app.get("/api/pharmacy-departments", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const collection =
            db.collection("pharmacy_inventory");

        const departments =
            await collection.distinct("Department_Name");

        res.json(
            departments
                .filter(value =>
                    value !== null &&
                    value !== undefined &&
                    String(value).trim() !== ""
                )
                .sort()
        );

    }

    catch (error) {

        console.error(
            "Pharmacy department filter error:",
            error
        );

        res.status(500).json({
            error: "Unable to load pharmacy departments"
        });

    }

});


// ======================================================
// PHARMACY FILTER HELPER
// ======================================================

function getPharmacyMatch(req) {

    const {
        facility,
        department
    } = req.query;

    const match = {};


    if (facility) {

        match.Facility_Name =
            facility;

    }


    if (department) {

        match.Department_Name =
            department;

    }


    return match;

}


// ======================================================
// PHARMACY KPIs
// ======================================================

app.get("/api/pharmacy-kpis", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const collection =
            db.collection("pharmacy_inventory");


        const match =
            getPharmacyMatch(req);


        const result =
            await collection.aggregate([

                {
                    $match: match
                },

                {
                    $addFields: {

                        stock: {

                            $convert: {

                                input:
                                    "$Stock_Quantity",

                                to: "double",

                                onError: 0,

                                onNull: 0

                            }

                        },

                        reorderLevel: {

                            $convert: {

                                input:
                                    "$Reorder_Level",

                                to: "double",

                                onError: 0,

                                onNull: 0

                            }

                        },

                        unitPrice: {

                            $convert: {

                                input:
                                    "$Unit_Price",

                                to: "double",

                                onError: 0,

                                onNull: 0

                            }

                        }

                    }

                },

                {
                    $group: {

                        _id: null,

                        totalStockQuantity: {

                            $sum: "$stock"

                        },

                        lowStockMedicines: {

                            $sum: {

                                $cond: [

                                    {
                                        $lte: [
                                            "$stock",
                                            "$reorderLevel"
                                        ]
                                    },

                                    1,

                                    0

                                ]

                            }

                        },

                        totalInventoryValue: {

                            $sum: {

                                $multiply: [
                                    "$stock",
                                    "$unitPrice"
                                ]

                            }

                        }

                    }

                }

            ]).toArray();


        // Get medicine count after applying filters

        const totalMedicines =
            await collection.distinct(
                "Medicine_ID",
                match
            );


        const data =
            result[0] || {};


        res.json({

            totalMedicines:

                totalMedicines.filter(
                    id =>
                        id !== null &&
                        id !== undefined &&
                        String(id).trim() !== ""
                ).length,

            totalStockQuantity:

                Number(
                    (data.totalStockQuantity || 0)
                    .toFixed(2)
                ),

            lowStockMedicines:

                data.lowStockMedicines || 0,

            totalInventoryValue:

                Number(
                    (data.totalInventoryValue || 0)
                    .toFixed(2)
                )

        });

    }

    catch (error) {

        console.error(
            "Pharmacy KPI MongoDB error:",
            error
        );

        res.status(500).json({

            error:
                "Unable to read pharmacy inventory collection"

        });

    }

});


// ======================================================
// STOCK QUANTITY BY MEDICINE CATEGORY
// ======================================================

app.get(
    "/api/pharmacy-category-stock",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const collection =
                db.collection("pharmacy_inventory");


            const match =
                getPharmacyMatch(req);


            const result =
                await collection.aggregate([

                    {
                        $match: match
                    },

                    {
                        $addFields: {

                            quantity: {

                                $convert: {

                                    input:
                                        "$Stock_Quantity",

                                    to: "double",

                                    onError: 0,

                                    onNull: 0

                                }

                            }

                        }

                    },

                    {
                        $group: {

                            _id:
                                "$Medicine_Category",

                            quantity: {

                                $sum:
                                    "$quantity"

                            }

                        }

                    },

                    {
                        $project: {

                            _id: 0,

                            category: {

                                $ifNull: [
                                    "$_id",
                                    "Unknown"
                                ]

                            },

                            quantity: 1

                        }

                    },

                    {
                        $sort: {

                            quantity: -1

                        }

                    }

                ]).toArray();


            res.json(result);

        }

        catch (error) {

            console.error(
                "Pharmacy category stock MongoDB error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to read pharmacy category stock"

            });

        }

    }

);


// ======================================================
// INVENTORY VALUE BY MEDICINE CATEGORY
// ======================================================

app.get(
    "/api/pharmacy-category-value",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const collection =
                db.collection("pharmacy_inventory");


            const match =
                getPharmacyMatch(req);


            const result =
                await collection.aggregate([

                    {
                        $match: match
                    },

                    {
                        $addFields: {

                            stock: {

                                $convert: {

                                    input:
                                        "$Stock_Quantity",

                                    to: "double",

                                    onError: 0,

                                    onNull: 0

                                }

                            },

                            price: {

                                $convert: {

                                    input:
                                        "$Unit_Price",

                                    to: "double",

                                    onError: 0,

                                    onNull: 0

                                }

                            }

                        }

                    },

                    {
                        $group: {

                            _id:
                                "$Medicine_Category",

                            value: {

                                $sum: {

                                    $multiply: [
                                        "$stock",
                                        "$price"
                                    ]

                                }

                            }

                        }

                    },

                    {
                        $project: {

                            _id: 0,

                            category: {

                                $ifNull: [
                                    "$_id",
                                    "Unknown"
                                ]

                            },

                            value: 1

                        }

                    },

                    {
                        $sort: {

                            value: -1

                        }

                    }

                ]).toArray();


            res.json(result);

        }

        catch (error) {

            console.error(
                "Pharmacy category value MongoDB error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to calculate inventory value"

            });

        }

    }

);


// ======================================================
// STOCK QUANTITY BY DEPARTMENT
// ======================================================

app.get(
    "/api/pharmacy-department-stock",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const collection =
                db.collection("pharmacy_inventory");


            const match =
                getPharmacyMatch(req);


            const result =
                await collection.aggregate([

                    {
                        $match: match
                    },

                    {
                        $addFields: {

                            quantity: {

                                $convert: {

                                    input:
                                        "$Stock_Quantity",

                                    to: "double",

                                    onError: 0,

                                    onNull: 0

                                }

                            }

                        }

                    },

                    {
                        $group: {

                            _id:
                                "$Department_Name",

                            quantity: {

                                $sum:
                                    "$quantity"

                            }

                        }

                    },

                    {
                        $project: {

                            _id: 0,

                            department: {

                                $ifNull: [
                                    "$_id",
                                    "Unknown"
                                ]

                            },

                            quantity: 1

                        }

                    },

                    {
                        $sort: {

                            quantity: -1

                        }

                    }

                ]).toArray();


            res.json(result);

        }

        catch (error) {

            console.error(
                "Pharmacy department stock MongoDB error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to read department stock"

            });

        }

    }

);


// ======================================================
// TOP 10 MEDICINES BY STOCK
// ======================================================

app.get(
    "/api/pharmacy-top-medicines",
    async (req, res) => {

        try {

            const db =
                client.db("HospitalDB");

            const collection =
                db.collection("pharmacy_inventory");


            const match =
                getPharmacyMatch(req);


            const result =
                await collection.aggregate([

                    {
                        $match: match
                    },

                    {
                        $addFields: {

                            quantity: {

                                $convert: {

                                    input:
                                        "$Stock_Quantity",

                                    to: "double",

                                    onError: 0,

                                    onNull: 0

                                }

                            }

                        }

                    },

                    {
                        $group: {

                            _id:
                                "$Medicine_Name",

                            quantity: {

                                $sum:
                                    "$quantity"

                            }

                        }

                    },

                    {
                        $project: {

                            _id: 0,

                            medicine: {

                                $ifNull: [
                                    "$_id",
                                    "Unknown"
                                ]

                            },

                            quantity: 1

                        }

                    },

                    {
                        $sort: {

                            quantity: -1

                        }

                    },

                    {
                        $limit: 10

                    }

                ]).toArray();


            res.json(result);

        }

        catch (error) {

            console.error(
                "Pharmacy top medicines MongoDB error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to read medicine stock"

            });

        }

    }

);
// ======================================================
// WORKFLOW AUTOMATION API
// ======================================================

app.get("/api/workflow-summary", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const appointments =
            db.collection("appointments");

        const billing =
            db.collection("billing");

        const pharmacy =
            db.collection("pharmacy_inventory");

        const attendance =
            db.collection("attendance");


        // ---------------------------------------------
        // APPOINTMENT ACTIONS
        // ---------------------------------------------

        const appointmentActions =
            await appointments.countDocuments({
                status: {
                    $in: [
                        "Pending",
                        "pending",
                        "Cancelled",
                        "cancelled",
                        "No Show",
                        "no_show"
                    ]
                }
            });

       // ======================================================
// WORKFLOW INSURANCE DETAILS
// ======================================================

app.get("/api/workflow-insurance", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const billing =
            db.collection("billing");

        const data =
            await billing.find({
                claim_status: {
                    $in: [
                        "Pending",
                        "pending"
                    ]
                }
            })
            .project({
                _id: 0,
                claim_id: 1,
                invoice_id: 1,
                patient_id: 1,
                department_name: 1,
                facility_name: 1,
                insurance_amount: 1,
                claim_submission_date: 1,
                claim_status: 1,
                claim_processing_time_days: 1
            })
            .toArray();

        res.json(data);

    }

    catch (error) {

        console.error(
            "Workflow insurance error:",
            error
        );

        res.status(500).json({
            error: "Failed to load insurance workflow"
        });

    }

});
        // ---------------------------------------------
        // INSURANCE CLAIM ACTIONS
        // ---------------------------------------------

        const insuranceActions =
            await billing.countDocuments({
                claim_status: {
                    $in: [
                        "Pending",
                        "pending"
                    ]
                }
            });


        // ---------------------------------------------
        // BILLING ACTIONS
        // ---------------------------------------------

        const billingActions =
            await billing.countDocuments({
                outstanding_amount: {
                    $gt: 0
                }
            });


        // ---------------------------------------------
        // PHARMACY REORDER ACTIONS
        // ---------------------------------------------

        const pharmacyActions =
            await pharmacy.countDocuments({
                $expr: {
                    $lte: [
                        {
                            $convert: {
                                input: "$Stock_Quantity",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        },
                        {
                            $convert: {
                                input: "$Reorder_Level",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    ]
                }
            });


        // ---------------------------------------------
        // STAFF ACTIONS
        // ---------------------------------------------

        const staffActions =
            await attendance.countDocuments({
                attendance_status: {
                    $in: [
                        "Absent",
                        "absent",
                        "Late",
                        "late"
                    ]
                }
            });


        // ---------------------------------------------
        // WORKFLOW TOTALS
        // ---------------------------------------------

        const pendingActions =
            appointmentActions +
            insuranceActions +
            billingActions +
            pharmacyActions +
            staffActions;


        const activeWorkflows =
            [
                appointmentActions,
                insuranceActions,
                billingActions,
                pharmacyActions,
                staffActions
            ].filter(value => value > 0).length;


        const completedActions =
            await appointments.countDocuments({
                status: {
                    $in: [
                        "Completed",
                        "completed"
                    ]
                }
            });


        const alerts =
            pharmacyActions +
            insuranceActions +
            staffActions;


        res.json({

            activeWorkflows,

            pendingActions,

            completedActions,

            alerts,

            appointmentActions,

            insuranceActions,

            billingActions,

            pharmacyActions,

            staffActions

        });

    }

    catch (error) {

        console.error(
            "Workflow API error:",
            error
        );

        res.status(500).json({
            error: "Failed to load workflow data"
        });

    }

});
// ======================================================
// WORKFLOW APPOINTMENT DETAILS
// ======================================================

app.get("/api/workflow-appointments", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const appointments =
            db.collection("appointments");

        const data =
            await appointments.find({
                status: {
                    $in: [
                        "Pending",
                        "pending",
                        "Cancelled",
                        "cancelled",
                        "No Show",
                        "no_show"
                    ]
                }
            })
            .project({
                _id: 0,
                appointment_id: 1,
                patient_id: 1,
                doctor_id: 1,
                department_name: 1,
                facility_name: 1,
                appointment_date: 1,
                appointment_type: 1,
                status: 1
            })
            .toArray();

        res.json(data);

    }

    catch (error) {

        console.error(
            "Workflow appointment error:",
            error
        );

        res.status(500).json({
            error: "Failed to load appointment workflow"
        });

    }

});


// ======================================================
// WORKFLOW INSURANCE CLAIM DETAILS
// ======================================================

app.get("/api/workflow-insurance", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const billing =
            db.collection("billing");

        const data =
            await billing.find({
                claim_status: {
                    $in: [
                        "Pending",
                        "pending"
                    ]
                }
            })
            .project({
                _id: 0,
                claim_id: 1,
                invoice_id: 1,
                patient_id: 1,
                department_name: 1,
                facility_name: 1,
                insurance_amount: 1,
                claim_submission_date: 1,
                claim_status: 1,
                claim_processing_time_days: 1
            })
            .toArray();

        res.json(data);

    }

    catch (error) {

        console.error(
            "Workflow insurance error:",
            error
        );

        res.status(500).json({
            error: "Failed to load insurance workflow"
        });

    }

});
// ======================================================
// WORKFLOW BILLING DETAILS
// ======================================================

app.get("/api/workflow-billing", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const billing =
            db.collection("billing");

        const data =
            await billing.find({
                outstanding_amount: {
                    $gt: 0
                }
            })
            .project({
                _id: 0,
                invoice_id: 1,
                patient_id: 1,
                doctor_id: 1,
                department_name: 1,
                facility_name: 1,
                billing_date: 1,
                invoice_amount: 1,
                patient_payment: 1,
                outstanding_amount: 1,
                payment_status: 1,
                payment_method: 1
            })
            .toArray();

        res.json(data);

    }

    catch (error) {

        console.error(
            "Workflow billing error:",
            error
        );

        res.status(500).json({
            error: "Failed to load billing workflow"
        });

    }

});
// ======================================================
// WORKFLOW PHARMACY DETAILS
// ======================================================

app.get("/api/workflow-pharmacy", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const pharmacy =
            db.collection("pharmacy_inventory");

        const data =
            await pharmacy.find({
                $expr: {
                    $lte: [
                        {
                            $convert: {
                                input: "$Stock_Quantity",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        },
                        {
                            $convert: {
                                input: "$Reorder_Level",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    ]
                }
            })
            .project({
                _id: 0,
                Medicine_ID: 1,
                Medicine_Name: 1,
                Medicine_Category: 1,
                Department_Name: 1,
                Stock_Quantity: 1,
                Reorder_Level: 1,
                Unit_Price: 1
            })
            .toArray();

        res.json(data);

    }

    catch (error) {

        console.error(
            "Workflow pharmacy error:",
            error
        );

        res.status(500).json({
            error: "Failed to load pharmacy workflow"
        });

    }

});
// ======================================================
// WORKFLOW STAFF & ATTENDANCE DETAILS
// ======================================================

app.get("/api/workflow-staff", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const attendance =
            db.collection("attendance");

        const data =
            await attendance.find({
                attendance_status: {
                    $in: [
                        "Absent",
                        "absent",
                        "Late",
                        "late"
                    ]
                }
            })
            .project({
                _id: 0,
                staff_id: 1,
                staff_name: 1,
                department_id: 1,
                department_name: 1,
                facility_id: 1,
                facility_name: 1,
                attendance_date: 1,
                attendance_status: 1,
                shift: 1
            })
            .toArray();

        res.json(data);

    }

    catch (error) {

        console.error(
            "Workflow staff error:",
            error
        );

        res.status(500).json({
            error: "Failed to load staff workflow"
        });

    }

});
// ======================================================
// WORKFLOW ALERTS API
// ======================================================

app.get("/api/workflow-alerts", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const appointments =
            db.collection("appointments");

        const billing =
            db.collection("billing");

        const pharmacy =
            db.collection("pharmacy_inventory");

        const attendance =
            db.collection("attendance");


        // -------------------------------
        // APPOINTMENT ALERTS
        // -------------------------------

        const appointmentAlerts =
            await appointments.countDocuments({
                status: {
                    $in: [
                        "Pending",
                        "pending",
                        "Cancelled",
                        "cancelled",
                        "No Show",
                        "no_show"
                    ]
                }
            });


        // -------------------------------
        // INSURANCE CLAIM ALERTS
        // -------------------------------

        const insuranceAlerts =
            await billing.countDocuments({
                claim_status: {
                    $in: [
                        "Pending",
                        "pending"
                    ]
                }
            });


        // -------------------------------
        // BILLING ALERTS
        // -------------------------------

        const billingAlerts =
            await billing.countDocuments({
                $expr: {
                    $gt: [
                        {
                            $convert: {
                                input: "$outstanding_amount",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        },
                        0
                    ]
                }
            });


        // -------------------------------
        // PHARMACY ALERTS
        // -------------------------------

        const pharmacyAlerts =
            await pharmacy.countDocuments({
                $expr: {
                    $lte: [
                        {
                            $convert: {
                                input: "$Stock_Quantity",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        },
                        {
                            $convert: {
                                input: "$Reorder_Level",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    ]
                }
            });


        // -------------------------------
        // STAFF ALERTS
        // -------------------------------

        const staffAlerts =
            await attendance.countDocuments({
                attendance_status: {
                    $in: [
                        "Absent",
                        "absent",
                        "Late",
                        "late"
                    ]
                }
            });


        const alerts = [];

        if (appointmentAlerts > 0) {
            alerts.push({
                type: "Appointment",
                message: "Appointments require attention",
                count: appointmentAlerts
            });
        }

        if (insuranceAlerts > 0) {
            alerts.push({
                type: "Insurance",
                message: "Insurance claims are pending",
                count: insuranceAlerts
            });
        }

        if (billingAlerts > 0) {
            alerts.push({
                type: "Billing",
                message: "Outstanding billing requires attention",
                count: billingAlerts
            });
        }

        if (pharmacyAlerts > 0) {
            alerts.push({
                type: "Pharmacy",
                message: "Medicines require reorder",
                count: pharmacyAlerts
            });
        }

        if (staffAlerts > 0) {
            alerts.push({
                type: "Staff",
                message: "Staff attendance requires attention",
                count: staffAlerts
            });
        }


        res.json(alerts);

    }

    catch (error) {

        console.error(
            "Workflow alerts error:",
            error
        );

        res.status(500).json({
            error: "Failed to load workflow alerts"
        });

    }

});
// ======================================================
// WORKFLOW APPOINTMENT DETAILS
// ======================================================

app.get("/api/workflow-appointments", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const appointments =
            db.collection("appointments");

        const data =
            await appointments.find({
                status: {
                    $in: [
                        "Pending",
                        "pending",
                        "Cancelled",
                        "cancelled",
                        "No Show",
                        "no_show"
                    ]
                }
            })
            .project({
                _id: 0,
                appointment_id: 1,
                patient_id: 1,
                doctor_id: 1,
                department_name: 1,
                appointment_date: 1,
                status: 1
            })
            .toArray();

        res.json(data);

    }

    catch (error) {

        console.error(
            "Workflow appointment error:",
            error
        );

        res.status(500).json({
            error: "Failed to load appointment workflow"
        });

    }

});
// ======================================================
// HEALTHCARE AI AGENT API
// ======================================================

// ======================================================
// HEALTHCARE AI AGENT API
// ======================================================

app.get("/api/ai-agent", async (req, res) => {

    try {

        const question =
            (req.query.question || "").toLowerCase().trim();

        const db = client.db("HospitalDB");

        let answer =
            "I could not understand the question. Please ask about patients, appointments, revenue, billing, insurance, pharmacy, staff, beds, or patient experience.";


        // ==================================================
        // PATIENTS
        // ==================================================

        if (
            question.includes("patient") &&
            (
                question.includes("how many") ||
                question.includes("total") ||
                question.includes("count")
            )
        ) {

            const count =
                await db.collection("patients").countDocuments();

            answer =
                `There are ${count} patients in the hospital database.`;
        }


        // ==================================================
        // ADMISSIONS
        // ==================================================

        else if (
            question.includes("admission") ||
            question.includes("admitted")
        ) {

            const count =
                await db.collection("admissions").countDocuments();

            answer =
                `There are ${count} admission records in the hospital database.`;
        }


        // ==================================================
        // PENDING INSURANCE CLAIMS
        // ==================================================

        else if (
            (
                question.includes("insurance") ||
                question.includes("claim")
            ) &&
            (
                question.includes("pending") ||
                question.includes("waiting")
            )
        ) {

            const count =
                await db.collection("billing").countDocuments({
                    claim_status: {
                        $in: [
                            "Pending",
                            "pending"
                        ]
                    }
                });

            answer =
                `There are ${count} pending insurance claims.`;
        }


        // ==================================================
        // REJECTED CLAIMS
        // ==================================================

        else if (
            (
                question.includes("claim") ||
                question.includes("insurance")
            ) &&
            question.includes("reject")
        ) {

            const count =
                await db.collection("billing").countDocuments({
                    claim_status: {
                        $in: [
                            "Rejected",
                            "rejected"
                        ]
                    }
                });

            answer =
                `There are ${count} rejected insurance claims.`;
        }


        // ==================================================
        // APPROVED CLAIMS
        // ==================================================

        else if (
            (
                question.includes("claim") ||
                question.includes("insurance")
            ) &&
            question.includes("approv")
        ) {

            const count =
                await db.collection("billing").countDocuments({
                    claim_status: {
                        $in: [
                            "Approved",
                            "approved"
                        ]
                    }
                });

            answer =
                `There are ${count} approved insurance claims.`;
        }


        // ==================================================
        // OUTSTANDING BILLING
        // ==================================================

        else if (
            question.includes("outstanding") &&
            (
                question.includes("billing") ||
                question.includes("amount") ||
                question.includes("payment")
            )
        ) {

            const result =
                await db.collection("billing").aggregate([
                    {
                        $group: {
                            _id: null,
                            total: {
                                $sum: {
                                    $convert: {
                                        input: "$outstanding_amount",
                                        to: "double",
                                        onError: 0,
                                        onNull: 0
                                    }
                                }
                            }
                        }
                    }
                ]).toArray();

            const total =
                result.length
                    ? result[0].total
                    : 0;

            answer =
                `The total outstanding billing amount is ₹${total.toFixed(2)}.`;
        }


        // ==================================================
        // TOTAL REVENUE
        // ==================================================

        else if (
            question.includes("revenue") ||
            question.includes("total billing") ||
            question.includes("total invoice")
        ) {

            const result =
                await db.collection("billing").aggregate([
                    {
                        $group: {
                            _id: null,
                            total: {
                                $sum: {
                                    $convert: {
                                        input: "$invoice_amount",
                                        to: "double",
                                        onError: 0,
                                        onNull: 0
                                    }
                                }
                            }
                        }
                    }
                ]).toArray();

            const total =
                result.length
                    ? result[0].total
                    : 0;

            answer =
                `The total invoice revenue is ₹${total.toFixed(2)}.`;
        }


        // ==================================================
        // MEDICINES REQUIRING REORDER
        // ==================================================

        else if (
            question.includes("medicine") &&
            (
                question.includes("reorder") ||
                question.includes("low stock") ||
                question.includes("low")
            )
        ) {

            const count =
                await db.collection("pharmacy_inventory").countDocuments({
                    $expr: {
                        $lte: [
                            {
                                $convert: {
                                    input: "$Stock_Quantity",
                                    to: "double",
                                    onError: 0,
                                    onNull: 0
                                }
                            },
                            {
                                $convert: {
                                    input: "$Reorder_Level",
                                    to: "double",
                                    onError: 0,
                                    onNull: 0
                                }
                            }
                        ]
                    }
                });

            answer =
                `${count} medicines currently require reorder.`;
        }


        // ==================================================
        // TOTAL MEDICINES
        // ==================================================

        else if (
            question.includes("medicine") &&
            (
                question.includes("how many") ||
                question.includes("total") ||
                question.includes("count")
            )
        ) {

            const count =
                await db.collection("pharmacy_inventory").countDocuments();

            answer =
                `There are ${count} medicine inventory records.`;
        }


        // ==================================================
        // ABSENT STAFF
        // ==================================================

        else if (
            question.includes("staff") &&
            question.includes("absent")
        ) {

            const count =
                await db.collection("attendance").countDocuments({
                    attendance_status: {
                        $in: [
                            "Absent",
                            "absent"
                        ]
                    }
                });

            answer =
                `There are ${count} staff attendance records marked as absent.`;
        }


        // ==================================================
        // LATE STAFF
        // ==================================================

        else if (
            question.includes("staff") &&
            (
                question.includes("late") ||
                question.includes("delay")
            )
        ) {

            const count =
                await db.collection("attendance").countDocuments({
                    attendance_status: {
                        $in: [
                            "Late",
                            "late"
                        ]
                    }
                });

            answer =
                `There are ${count} staff attendance records marked as late.`;
        }


        // ==================================================
        // STAFF TOTAL
        // ==================================================

        else if (
            question.includes("staff") &&
            (
                question.includes("how many") ||
                question.includes("total") ||
                question.includes("count")
            )
        ) {

            const count =
                await db.collection("staff").countDocuments();

            answer =
                `There are ${count} staff records in the hospital database.`;
        }


        // ==================================================
        // APPOINTMENTS REQUIRING ATTENTION
        // ==================================================

        else if (
            question.includes("appointment") &&
            (
                question.includes("attention") ||
                question.includes("problem") ||
                question.includes("pending") ||
                question.includes("issue")
            )
        ) {

            const count =
                await db.collection("appointments").countDocuments({
                    status: {
                        $in: [
                            "Pending",
                            "pending",
                            "Cancelled",
                            "cancelled",
                            "No Show",
                            "no_show"
                        ]
                    }
                });

            answer =
                `${count} appointments currently require attention.`;
        }


        // ==================================================
        // TOTAL APPOINTMENTS
        // ==================================================

        else if (
            question.includes("appointment") &&
            (
                question.includes("how many") ||
                question.includes("total") ||
                question.includes("count")
            )
        ) {

            const count =
                await db.collection("appointments").countDocuments();

            answer =
                `There are ${count} appointment records.`;
        }


        // ==================================================
        // COMPLETED APPOINTMENTS
        // ==================================================

        else if (
            question.includes("appointment") &&
            (
                question.includes("completed") ||
                question.includes("complete")
            )
        ) {

            const count =
                await db.collection("appointments").countDocuments({
                    status: {
                        $in: [
                            "Completed",
                            "completed"
                        ]
                    }
                });

            answer =
                `There are ${count} completed appointments.`;
        }


        // ==================================================
        // BED OCCUPANCY
        // ==================================================

        else if (
            question.includes("bed") &&
            (
                question.includes("occupancy") ||
                question.includes("occupied")
            )
        ) {

            const result =
                await db.collection("bed_occupancy").aggregate([
                    {
                        $group: {
                            _id: null,
                            average: {
                                $avg: {
                                    $convert: {
                                        input: "$bed_occupancy_rate",
                                        to: "double",
                                        onError: 0,
                                        onNull: 0
                                    }
                                }
                            }
                        }
                    }
                ]).toArray();

            const average =
                result.length
                    ? result[0].average
                    : 0;

            answer =
                `The average bed occupancy rate is ${average.toFixed(2)}%.`;
        }


        // ==================================================
        // PATIENT FEEDBACK
        // ==================================================

        else if (
            question.includes("feedback") ||
            question.includes("satisfaction") ||
            question.includes("rating")
        ) {

            const result =
                await db.collection("feedback").aggregate([
                    {
                        $group: {
                            _id: null,
                            average: {
                                $avg: {
                                    $convert: {
                                        input: "$rating",
                                        to: "double",
                                        onError: 0,
                                        onNull: 0
                                    }
                                }
                            }
                        }
                    }
                ]).toArray();

            const average =
                result.length
                    ? result[0].average
                    : 0;

            answer =
                `The average patient feedback rating is ${average.toFixed(2)}.`;
        }


        // ==================================================
        // FINAL RESPONSE
        // ==================================================

        res.json({
            answer: answer
        });

    }

    catch (error) {

        console.error(
            "AI Agent error:",
            error
        );

        res.status(500).json({
            error: "Failed to process AI Agent request"
        });

    }
});
// ===============================
// EXECUTIVE FACILITY FILTER API
// ===============================
app.get("/api/executive-facilities", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const facilities = await db.collection("department_facilities")
            .distinct("facility_name");

        res.json(facilities.filter(Boolean).sort());

    } catch (error) {
        console.error("Facility filter error:", error);

        res.status(500).json({
            error: "Unable to load facilities"
        });
    }
});
// ===============================
// EXECUTIVE DEPARTMENT FILTER API
// ===============================
app.get("/api/executive-departments", async (req, res) => {
    try {
        const db = client.db("HospitalDB");

        const departments = await db.collection("department_facilities")
            .distinct("department_name");

        res.json(departments.filter(Boolean).sort());

    } catch (error) {
        console.error("Department filter error:", error);

        res.status(500).json({
            error: "Unable to load departments"
        });
    }
});



// ===============================
// PATIENT OPERATIONS FILTERS
// ===============================

app.get("/api/patient-facilities", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const facilities =
            await db.collection("appointments")
                .distinct("facility_name");

        res.json(
            facilities
                .filter(Boolean)
                .sort()
        );

    } catch (error) {

        console.error(
            "Patient facility filter error:",
            error
        );

        res.status(500).json({
            error: "Unable to load patient facilities"
        });

    }

});


app.get("/api/patient-departments", async (req, res) => {

    try {

        const db = client.db("HospitalDB");

        const departments =
            await db.collection("appointments")
                .distinct("department_name");

        res.json(
            departments
                .filter(Boolean)
                .sort()
        );

    } catch (error) {

        console.error(
            "Patient department filter error:",
            error
        );

        res.status(500).json({
            error: "Unable to load patient departments"
        });

    }

});


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});