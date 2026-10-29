
import os
from datetime import datetime, timezone

import MetaTrader5 as mt5
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException

load_dotenv()

app = FastAPI(title="KeliLeliBot MT5 Service")

API_TOKEN = os.getenv("API_TOKEN", "")
MT5_SYMBOL = os.getenv("MT5_SYMBOL", "XAUUSD")
TRADE_MODE = os.getenv("TRADE_MODE", "paper")

TIMEFRAMES = {
    "M5": mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,
}


def authorize(authorization: str | None):
    if not API_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="API_TOKEN nuk eshte konfiguruar",
        )

    if authorization != f"Bearer {API_TOKEN}":
        raise HTTPException(
            status_code=401,
            detail="Token i pavlefshem",
        )


def connect_mt5():
    if not mt5.initialize():
        raise HTTPException(
            status_code=503,
            detail=f"MT5 nuk u lidh: {mt5.last_error()}",
        )


def get_candles(timeframe, count=250):
    rates = mt5.copy_rates_from_pos(
        MT5_SYMBOL,
        timeframe,
        1,
        count,
    )

    if rates is None or len(rates) < 210:
        raise HTTPException(
            status_code=503,
            detail=f"Nuk ka mjaftueshem candles per {MT5_SYMBOL}",
        )

    return rates


def ema(values, period):
    alpha = 2 / (period + 1)
    result = [float(values[0])]

    for value in values[1:]:
        result.append(
            alpha * float(value) + (1 - alpha) * result[-1]
        )

    return result


def atr(rates, period=14):
    ranges = []

    for i in range(1, len(rates)):
        high = float(rates[i]["high"])
        low = float(rates[i]["low"])
        previous_close = float(rates[i - 1]["close"])

        ranges.append(
            max(
                high - low,
                abs(high - previous_close),
                abs(low - previous_close),
            )
        )

    if len(ranges) < period:
        raise HTTPException(
            status_code=503,
            detail="Nuk ka mjaftueshem te dhena per ATR",
        )

    return sum(ranges[-period:]) / period


def analyze():
    m15 = get_candles(TIMEFRAMES["M15"])
    m5 = get_candles(TIMEFRAMES["M5"])

    close15 = [float(c["close"]) for c in m15]
    close5 = [float(c["close"]) for c in m5]

    ema50_15 = ema(close15, 50)[-1]
    ema200_15 = ema(close15, 200)[-1]

    ema9_5 = ema(close5, 9)
    ema21_5 = ema(close5, 21)

    last_close = close5[-1]
    previous_close = close5[-2]
    last_ema9 = ema9_5[-1]
    last_ema21 = ema21_5[-1]
    previous_ema9 = ema9_5[-2]

    current_atr = atr(m5)
    direction = "WAIT"
    reason = "Nuk ka konfirmim te mjaftueshem"

    if ema50_15 > ema200_15:
        if (
            previous_close <= previous_ema9
            and last_close > last_ema9
            and last_ema9 > last_ema21
        ):
            direction = "BUY"
            reason = "Trend M15 bullish dhe konfirmim M5"

    elif ema50_15 < ema200_15:
        if (
            previous_close >= previous_ema9
            and last_close < last_ema9
            and last_ema9 < last_ema21
        ):
            direction = "SELL"
            reason = "Trend M15 bearish dhe konfirmim M5"

    entry = last_close

    if direction == "BUY":
        stop_loss = entry - (1.5 * current_atr)
        take_profit_1 = entry + current_atr
        take_profit_2 = entry + (2 * current_atr)
    elif direction == "SELL":
        stop_loss = entry + (1.5 * current_atr)
        take_profit_1 = entry - current_atr
        take_profit_2 = entry - (2 * current_atr)
    else:
        stop_loss = None
        take_profit_1 = None
        take_profit_2 = None

    return {
        "symbol": MT5_SYMBOL,
        "mode": TRADE_MODE,
        "signal": direction,
        "entry": round(entry, 3),
        "stop_loss": round(stop_loss, 3) if stop_loss is not None else None,
        "take_profit_1": round(take_profit_1, 3) if take_profit_1 is not None else None,
        "take_profit_2": round(take_profit_2, 3) if take_profit_2 is not None else None,
        "trend_m15": (
            "BULLISH" if ema50_15 > ema200_15
            else "BEARISH" if ema50_15 < ema200_15
            else "NEUTRAL"
        ),
        "reason": reason,
        "last_candle_time_utc": datetime.fromtimestamp(
            int(m5[-1]["time"]),
            tz=timezone.utc,
        ).isoformat(),
        "live_orders_enabled": False,
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "mode": TRADE_MODE,
        "live_orders_enabled": False,
    }


@app.get("/signal")
def signal(authorization: str | None = Header(default=None)):
    authorize(authorization)

    if TRADE_MODE != "paper":
        raise HTTPException(
            status_code=403,
            detail="Ky version lejon vetem paper mode",
        )

    connect_mt5()

    try:
        if not mt5.symbol_select(MT5_SYMBOL, True):
            raise HTTPException(
                status_code=503,
                detail=f"Simboli {MT5_SYMBOL} nuk u gjet ne MT5",
            )

        return analyze()
    finally:
        mt5.shutdown()
