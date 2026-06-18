#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BIAIS MACRO EUR/USD - VERSION GITHUB ACTIONS
=============================================
Ce script est conçu pour tourner sur GitHub Actions.
Il calcule le biais hebdo et sauvegarde le résultat dans un fichier.
"""

import yfinance as yf
import pandas as pd
from datetime import datetime

def get_data(ticker, period="1mo"):
    """Récupère les données historiques via Yahoo Finance"""
    try:
        data = yf.download(ticker, period=period, interval="1d", progress=False)
        if data.empty:
            return None
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        return data
    except Exception as e:
        print(f"Erreur récupération {ticker}: {e}")
        return None

def calculate_bias():
    """Calcule le biais macro hebdo"""

    print("=" * 70)
    print("BIAIS MACRO EUR/USD")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 70)

    # Récupération des données
    us10y_data = get_data("^TNX", "1mo")
    dxy_data = get_data("DX-Y.NYB", "1mo")
    oil_data = get_data("CL=F", "1mo")
    eurusd_data = get_data("EURUSD=X", "1mo")

    if not all([us10y_data is not None, dxy_data is not None, 
                oil_data is not None, eurusd_data is not None]):
        print("❌ Erreur: Impossible de récupérer toutes les données")
        return None

    # Extraction des valeurs
    us10y_now = float(us10y_data['Close'].iloc[-1])
    us10y_5d = float(us10y_data['Close'].iloc[-5]) if len(us10y_data) >= 5 else us10y_now

    dxy_now = float(dxy_data['Close'].iloc[-1])
    dxy_5d = float(dxy_data['Close'].iloc[-5]) if len(dxy_data) >= 5 else dxy_now

    oil_now = float(oil_data['Close'].iloc[-1])
    oil_5d = float(oil_data['Close'].iloc[-5]) if len(oil_data) >= 5 else oil_now

    eurusd_now = float(eurusd_data['Close'].iloc[-1])
    eurusd_5d = float(eurusd_data['Close'].iloc[-5]) if len(eurusd_data) >= 5 else eurusd_now

    # Calcul des scores
    us10y_change = us10y_now - us10y_5d
    score_taux = -1.5 if us10y_change > 0.05 else 1.5 if us10y_change < -0.05 else 0

    dxy_change = ((dxy_now / dxy_5d) - 1) * 100
    score_dxy = -1.5 if dxy_change > 0.5 else 1.5 if dxy_change < -0.5 else 0

    oil_change = ((oil_now / oil_5d) - 1) * 100
    score_oil = -1.0 if oil_change > 5 else 1.0 if oil_change < -5 else 0

    eurusd_change = ((eurusd_now / eurusd_5d) - 1) * 100
    score_momentum = 1.0 if eurusd_change > 0.5 else -1.0 if eurusd_change < -0.5 else 0

    score_total = score_taux + score_dxy + score_oil + score_momentum

    # Interprétation
    if score_total >= 3:
        bias = "HAISSIER EUR FORT ⬇️"
        action = "Chercher des VENTES en 15 min"
    elif score_total >= 1.5:
        bias = "HAISSIER EUR MODÉRÉ ⬇️"
        action = "Privilégier les VENTES"
    elif score_total > -1.5:
        bias = "NEUTRE ➡️"
        action = "Réduire la taille, attendre"
    elif score_total > -3:
        bias = "HAISSIER USD MODÉRÉ ⬆️"
        action = "Privilégier les ACHATS"
    else:
        bias = "HAISSIER USD FORT ⬆️"
        action = "Chercher des ACHATS en 15 min"

    confiance = "ÉLEVÉE" if abs(score_total) >= 3 else "MODÉRÉE" if abs(score_total) >= 1.5 else "FAIBLE"

    # Créer le rapport
    report = f"""
{'='*70}
BIAIS MACRO EUR/USD
Date: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}
{'='*70}

DONNÉES:
  US10Y: {us10y_now:.3f}% (var 5j: {us10y_change:+.3f}%)
  DXY: {dxy_now:.2f} (var 5j: {dxy_change:+.2f}%)
  Pétrole: {oil_now:.2f}$ (var 5j: {oil_change:+.2f}%)
  EUR/USD: {eurusd_now:.5f} (var 5j: {eurusd_change:+.2f}%)

SCORES:
  Taux:     {score_taux:+.1f}
  DXY:      {score_dxy:+.1f}
  Pétrole:  {score_oil:+.1f}
  Momentum: {score_momentum:+.1f}
  ───────────────
  TOTAL:    {score_total:+.1f} / 4.5

RÉSULTAT:
  Bias: {bias}
  Confiance: {confiance}
  Action: {action}
  Marge d'erreur: ~{max(15, 40 - int(abs(score_total)*8))}%

{'='*70}
"""

    print(report)

    # Sauvegarder dans un fichier
    with open("biais_resultat.txt", "w", encoding="utf-8") as f:
        f.write(report)

    print("✅ Rapport sauvegardé dans 'biais_resultat.txt'")

    return {
        'score': score_total,
        'bias': bias,
        'confiance': confiance,
        'action': action
    }

if __name__ == "__main__":
    calculate_bias()
