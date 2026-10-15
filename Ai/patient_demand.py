import pandas as pd
import numpy as np
import joblib
from pathlib import Path

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_FILE = BASE_DIR / "data" / "Appointments.csv"

MODEL_FILE = BASE_DIR / "ai" / "patient_demand_model.pkl"

OUTPUT_FILE = BASE_DIR / "ai" / "patient_demand_forecast.csv"


# ============================================================
# LOAD DATA
# ============================================================

print("Loading appointment data...")

df = pd.read_csv(DATA_FILE)

print(f"Total appointment records: {len(df)}")


# ============================================================
# CHECK REQUIRED COLUMN
# ============================================================

required_columns = [
    "appointment_date"
]

for column in required_columns:

    if column not in df.columns:

        raise ValueError(
            f"Required column '{column}' not found in Appointments.csv"
        )


# ============================================================
# CONVERT DATE
# ============================================================

df["appointment_date"] = pd.to_datetime(
    df["appointment_date"],
    errors="coerce"
)


# Remove invalid dates

df = df.dropna(
    subset=["appointment_date"]
)


# ============================================================
# CREATE DAILY APPOINTMENT COUNT
# ============================================================

daily = (
    df.groupby(
        df["appointment_date"].dt.date
    )
    .size()
    .reset_index(name="appointment_count")
)


daily["appointment_date"] = pd.to_datetime(
    daily["appointment_date"]
)


daily = daily.sort_values(
    "appointment_date"
)


print(
    f"Date range: "
    f"{daily['appointment_date'].min().date()} "
    f"to "
    f"{daily['appointment_date'].max().date()}"
)


# ============================================================
# CREATE CONTINUOUS DATE RANGE
# ============================================================

full_dates = pd.date_range(
    start=daily["appointment_date"].min(),
    end=daily["appointment_date"].max(),
    freq="D"
)


daily = (
    daily.set_index("appointment_date")
    .reindex(full_dates, fill_value=0)
    .rename_axis("appointment_date")
    .reset_index()
)


# ============================================================
# CREATE TIME FEATURES
# ============================================================

daily["day_of_week"] = (
    daily["appointment_date"].dt.dayofweek
)

daily["day_of_month"] = (
    daily["appointment_date"].dt.day
)

daily["month"] = (
    daily["appointment_date"].dt.month
)

daily["week_of_year"] = (
    daily["appointment_date"].dt.isocalendar().week.astype(int)
)

daily["is_weekend"] = (
    daily["day_of_week"] >= 5
).astype(int)


# ============================================================
# CREATE LAG FEATURES
# ============================================================

daily["lag_1"] = (
    daily["appointment_count"].shift(1)
)

daily["lag_7"] = (
    daily["appointment_count"].shift(7)
)

daily["rolling_7"] = (
    daily["appointment_count"]
    .shift(1)
    .rolling(7)
    .mean()
)


# Remove rows created by lag features

model_data = daily.dropna().copy()


# ============================================================
# FEATURES
# ============================================================

features = [

    "day_of_week",

    "day_of_month",

    "month",

    "week_of_year",

    "is_weekend",

    "lag_1",

    "lag_7",

    "rolling_7"

]


X = model_data[features]

y = model_data["appointment_count"]


# ============================================================
# TIME-BASED TRAIN / TEST SPLIT
# ============================================================

split_index = int(
    len(model_data) * 0.80
)


X_train = X.iloc[:split_index]

X_test = X.iloc[split_index:]


y_train = y.iloc[:split_index]

y_test = y.iloc[split_index:]


print(
    f"Training records: {len(X_train)}"
)

print(
    f"Testing records: {len(X_test)}"
)


# ============================================================
# TRAIN MODEL
# ============================================================

print("\nTraining Random Forest model...")


model = RandomForestRegressor(

    n_estimators=200,

    random_state=42,

    max_depth=10,

    min_samples_leaf=2

)


model.fit(
    X_train,
    y_train
)


# ============================================================
# TEST MODEL
# ============================================================

predictions = model.predict(
    X_test
)


mae = mean_absolute_error(
    y_test,
    predictions
)


print(
    f"\nMean Absolute Error: {mae:.2f}"
)


# ============================================================
# SAVE MODEL
# ============================================================

joblib.dump(
    model,
    MODEL_FILE
)


print(
    f"\nModel saved to:"
)

print(
    MODEL_FILE
)


# ============================================================
# GENERATE 7-DAY FORECAST
# ============================================================

print(
    "\nGenerating 7-day patient demand forecast..."
)


history = daily[
    ["appointment_date", "appointment_count"]
].copy()


forecast_rows = []


for i in range(7):

    next_date = (
        history["appointment_date"].max()
        + pd.Timedelta(days=1)
    )


    day_of_week = (
        next_date.dayofweek
    )

    day_of_month = (
        next_date.day
    )

    month = (
        next_date.month
    )

    week_of_year = (
        next_date.isocalendar().week
    )

    is_weekend = int(
        day_of_week >= 5
    )


    lag_1 = (
        history["appointment_count"]
        .iloc[-1]
    )


    if len(history) >= 7:

        lag_7 = (
            history["appointment_count"]
            .iloc[-7]
        )

    else:

        lag_7 = lag_1


    rolling_7 = (
        history["appointment_count"]
        .tail(7)
        .mean()
    )


    input_data = pd.DataFrame(
        [[

            day_of_week,

            day_of_month,

            month,

            int(week_of_year),

            is_weekend,

            lag_1,

            lag_7,

            rolling_7

        ]],
        columns=features
    )


    prediction = model.predict(
        input_data
    )[0]


    prediction = max(
        0,
        round(prediction)
    )


    forecast_rows.append({

        "date":
            next_date.strftime("%Y-%m-%d"),

        "predicted_appointments":
            prediction

    })


    # Add prediction to history

    history = pd.concat(

        [

            history,

            pd.DataFrame({

                "appointment_date":
                    [next_date],

                "appointment_count":
                    [prediction]

            })

        ],

        ignore_index=True

    )


# ============================================================
# SAVE FORECAST
# ============================================================

forecast_df = pd.DataFrame(
    forecast_rows
)


forecast_df.to_csv(
    OUTPUT_FILE,
    index=False
)


print(
    "\n7-Day Patient Demand Forecast:"
)

print(
    forecast_df.to_string(
        index=False
    )
)


print(
    f"\nForecast saved to:"
)

print(
    OUTPUT_FILE
)


print(
    "\nPatient demand prediction completed successfully."
)