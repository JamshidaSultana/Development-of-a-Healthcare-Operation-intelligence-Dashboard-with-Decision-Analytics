import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error


# =====================================================
# FILE PATH
# =====================================================

file_path = r"C:\Users\JAMSHID SULTANA\Desktop\Healthcare Project\data\Bed_Occupancy.csv"

# =====================================================
# LOAD DATA
# =====================================================

df = pd.read_excel(
    file_path,
    sheet_name="Bed_Occupancy"
)


# =====================================================
# CLEAN EMPTY COLUMNS
# =====================================================

df = df.dropna(axis=1, how="all")


# =====================================================
# CHECK REQUIRED COLUMNS
# =====================================================

required_columns = [
    "facility_id",
    "facility_name",
    "department_id",
    "department_name",
    "total_beds",
    "occupied_beds",
    "available_beds",
    "bed_occupancy_rate",
    "date"
]

missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]

if missing_columns:

    raise ValueError(
        f"Missing columns: {missing_columns}"
    )


# =====================================================
# PREPARE DATA
# =====================================================

df["date"] = pd.to_datetime(
    df["date"]
)

df["bed_occupancy_rate"] = pd.to_numeric(
    df["bed_occupancy_rate"],
    errors="coerce"
)

df = df.dropna(
    subset=[
        "date",
        "bed_occupancy_rate"
    ]
)


# =====================================================
# DAILY OCCUPANCY
# =====================================================

daily = (
    df.groupby("date")["bed_occupancy_rate"]
    .mean()
    .reset_index()
)

daily = daily.sort_values("date")


# =====================================================
# TIME FEATURES
# =====================================================

daily["day_of_week"] = (
    daily["date"].dt.dayofweek
)

daily["day_of_month"] = (
    daily["date"].dt.day
)

daily["month"] = (
    daily["date"].dt.month
)

daily["week_of_year"] = (
    daily["date"].dt.isocalendar().week.astype(int)
)

daily["is_weekend"] = (
    daily["day_of_week"] >= 5
).astype(int)


# =====================================================
# LAG FEATURES
# =====================================================

daily["lag_1"] = (
    daily["bed_occupancy_rate"]
    .shift(1)
)

daily["lag_7"] = (
    daily["bed_occupancy_rate"]
    .shift(7)
)

daily["rolling_7"] = (
    daily["bed_occupancy_rate"]
    .rolling(7)
    .mean()
)


# Remove rows with missing feature values

daily = daily.dropna().reset_index(
    drop=True
)


# =====================================================
# FEATURES AND TARGET
# =====================================================

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

X = daily[features]

y = daily["bed_occupancy_rate"]


# =====================================================
# TIME-BASED TRAIN TEST SPLIT
# =====================================================

split_index = int(
    len(daily) * 0.8
)

X_train = X.iloc[:split_index]

X_test = X.iloc[split_index:]

y_train = y.iloc[:split_index]

y_test = y.iloc[split_index:]


# =====================================================
# TRAIN MODEL
# =====================================================

model = RandomForestRegressor(
    n_estimators=200,
    random_state=42
)

model.fit(
    X_train,
    y_train
)


# =====================================================
# MODEL EVALUATION
# =====================================================

predictions = model.predict(
    X_test
)

mae = mean_absolute_error(
    y_test,
    predictions
)

print(
    f"Mean Absolute Error: {mae:.2f}%"
)


# =====================================================
# SAVE MODEL
# =====================================================

joblib.dump(
    model,
    "bed_occupancy_model.pkl"
)


# =====================================================
# 7-DAY FORECAST
# =====================================================

history = daily[
    ["date", "bed_occupancy_rate"]
].copy()

forecast = []

for i in range(7):

    next_date = (
        history["date"].max()
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
        history["bed_occupancy_rate"]
        .iloc[-1]
    )

    if len(history) >= 7:

        lag_7 = (
            history["bed_occupancy_rate"]
            .iloc[-7]
        )

        rolling_7 = (
            history["bed_occupancy_rate"]
            .tail(7)
            .mean()
        )

    else:

        lag_7 = lag_1

        rolling_7 = lag_1


    input_data = pd.DataFrame(
        [[
            day_of_week,
            day_of_month,
            month,
            week_of_year,
            is_weekend,
            lag_1,
            lag_7,
            rolling_7
        ]],
        columns=features
    )


    predicted_rate = model.predict(
        input_data
    )[0]


    predicted_rate = max(
        0,
        min(100, predicted_rate)
    )


    forecast.append({
        "date": next_date.strftime(
            "%Y-%m-%d"
        ),
        "predicted_occupancy_rate":
            round(predicted_rate, 2)
    })


    history = pd.concat(
        [
            history,
            pd.DataFrame({
                "date": [next_date],
                "bed_occupancy_rate":
                    [predicted_rate]
            })
        ],
        ignore_index=True
    )


# =====================================================
# SAVE FORECAST
# =====================================================

forecast_df = pd.DataFrame(
    forecast
)

forecast_df.to_csv(
    "bed_occupancy_forecast.csv",
    index=False
)


# =====================================================
# DISPLAY RESULTS
# =====================================================

print()
print("7-DAY BED OCCUPANCY FORECAST")
print()

print(
    forecast_df.to_string(
        index=False
    )
)

print()
print(
    "BED OCCUPANCY PREDICTION COMPLETED."
)