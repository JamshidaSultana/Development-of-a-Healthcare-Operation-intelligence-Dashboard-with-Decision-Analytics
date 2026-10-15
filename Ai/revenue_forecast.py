import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error


# =====================================================
# FILE PATH
# =====================================================

file_path = r"C:\Users\JAMSHID SULTANA\Desktop\Healthcare Project\data\Billing.csv"


# =====================================================
# LOAD BILLING DATA
# =====================================================

df = pd.read_csv(file_path)


# =====================================================
# CHECK REQUIRED COLUMNS
# =====================================================

required_columns = [
    "billing_date",
    "invoice_amount"
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

df["billing_date"] = pd.to_datetime(
    df["billing_date"],
    errors="coerce"
)

df["invoice_amount"] = pd.to_numeric(
    df["invoice_amount"],
    errors="coerce"
)

df = df.dropna(
    subset=[
        "billing_date",
        "invoice_amount"
    ]
)


# =====================================================
# DAILY REVENUE
# =====================================================

daily = (
    df.groupby("billing_date")["invoice_amount"]
    .sum()
    .reset_index()
)

daily.columns = [
    "date",
    "revenue"
]

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
    daily["revenue"].shift(1)
)

daily["lag_7"] = (
    daily["revenue"].shift(7)
)

daily["rolling_7"] = (
    daily["revenue"]
    .rolling(7)
    .mean()
)


# Remove rows with missing values

daily = daily.dropna().reset_index(
    drop=True
)


# =====================================================
# FEATURES
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

y = daily["revenue"]


# =====================================================
# TRAIN / TEST SPLIT
# =====================================================

split_index = int(
    len(daily) * 0.8
)

X_train = X.iloc[:split_index]

X_test = X.iloc[split_index:]

y_train = y.iloc[:split_index]

y_test = y.iloc[split_index:]


# =====================================================
# TRAIN RANDOM FOREST
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
    f"Mean Absolute Error: {mae:.2f}"
)


# =====================================================
# SAVE MODEL
# =====================================================

joblib.dump(
    model,
    "revenue_forecast_model.pkl"
)


# =====================================================
# 7-DAY REVENUE FORECAST
# =====================================================

history = daily[
    ["date", "revenue"]
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
        history["revenue"].iloc[-1]
    )

    if len(history) >= 7:

        lag_7 = (
            history["revenue"].iloc[-7]
        )

        rolling_7 = (
            history["revenue"]
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


    predicted_revenue = model.predict(
        input_data
    )[0]


    predicted_revenue = max(
        0,
        predicted_revenue
    )


    forecast.append({
        "date": next_date.strftime(
            "%Y-%m-%d"
        ),
        "predicted_revenue":
            round(predicted_revenue, 2)
    })


    history = pd.concat(
        [
            history,
            pd.DataFrame({
                "date": [next_date],
                "revenue": [
                    predicted_revenue
                ]
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
    "revenue_forecast.csv",
    index=False
)


# =====================================================
# DISPLAY RESULTS
# =====================================================

print()
print("7-DAY REVENUE FORECAST")
print()

print(
    forecast_df.to_string(
        index=False
    )
)

print()
print(
    "REVENUE FORECAST COMPLETED."
)