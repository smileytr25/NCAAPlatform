from enum import CONFORM
from operator import is_
import psycopg2
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import pandas as pd
import numpy as np
import requests 
from bs4 import BeautifulSoup 
from io import StringIO
import matplotlib.pyplot as plt
import os 
import pickle 
import json
from datetime import datetime
import time
import psycopg2
from pathlib import Path
import joblib
from scipy.interpolate import interp1d

# Database table for game_distribution_metrics cache:
# CREATE TABLE IF NOT EXISTS game_distribution_metrics (
#     team VARCHAR(255) NOT NULL,
#     opponent VARCHAR(255) NOT NULL,
#     gamedate DATE NOT NULL,
#     n_samples INTEGER NOT NULL DEFAULT 20000,
#     sims INTEGER NOT NULL DEFAULT 200,
#     blowout_margin NUMERIC NOT NULL DEFAULT 15.0,
#     metrics_json TEXT NOT NULL,
#     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#     PRIMARY KEY (team, opponent, gamedate, n_samples, sims, blowout_margin)
# );

conn = psycopg2.connect(
    host="localhost",
    database="ncaa",
    port = 5432
)
cursor = conn.cursor()

MODEL_Q5 = joblib.load("./models/model_q5.joblib")
MODEL_Q10 = joblib.load("./models/model_q10.joblib")
MODEL_Q25 = joblib.load("./models/model_q25.joblib")
MODEL_Q50 = joblib.load("./models/model_q50.joblib")
MODEL_Q75 = joblib.load("./models/model_q75.joblib")
MODEL_Q90 = joblib.load("./models/model_q90.joblib")
MODEL_Q95 = joblib.load("./models/model_q95.joblib")
CONFORMAL_DELTA_50 = joblib.load("./models/conformal_delta_50.joblib")
CONFORMAL_DELTA_80 = joblib.load("./models/conformal_delta_80.joblib")
CONFORMAL_DELTA_90 = joblib.load("./models/conformal_delta_90.joblib")

EXPECTED_COLS = MODEL_Q50.feature_names_in_

cursor.execute("SELECT * FROM players_box_w_conferences;")
cols = [desc[0] for desc in cursor.description]
players_box_df = pd.DataFrame(cursor.fetchall(), columns=cols)
players_box_df = players_box_df[players_box_df.player != 'School Totals']

cursor.execute("SELECT * FROM matchups_w_conferences;")
cols = [desc[0] for desc in cursor.description]
matchups_df = pd.DataFrame(cursor.fetchall(), columns=cols)

cursor.execute("SELECT DISTINCT conference FROM conferences;")
conferences = {row[0] for row in cursor.fetchall()}

cursor.execute("SELECT * FROM current_ap;")
ap_poll = pd.DataFrame(cursor.fetchall(), columns=["Team", "rank"])

team_name_mapping = {
        "Connecticut": "UConn",
        "North Carolina": "UNC",
        "St. John's": "St. John's (NY)"
    }

ap_poll["Team"] = ap_poll["Team"].map(
    lambda x : team_name_mapping.get(x, x)
)

cursor.execute("SELECT * FROM conferences;")
cols = [desc[0] for desc in cursor.description]
conferences_df = pd.DataFrame(cursor.fetchall(), columns=cols)

cursor.execute("SELECT * FROM logo_images;")
cols = [desc[0] for desc in cursor.description]
logo_images_df = pd.DataFrame(cursor.fetchall(), columns=cols)

player_photos_df = pd.read_csv("./data/player_photos.csv")

cursor.execute("SELECT * FROM schedule;")
cols = [desc[0] for desc in cursor.description]
schedule_df = pd.DataFrame(cursor.fetchall(), columns=cols)

def get_NET_ratings():
    url = "https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings"
    r = requests.get(url)
    soup = BeautifulSoup(r.content, 'html.parser')
    table = soup.find('table')
    df = pd.read_html(StringIO(str(table)))[0]
    df["Quad 1 W"] = df["Quad 1"].str.extract(r'(\d+)-\d+').astype(int)
    df["Quad 1 L"] = df["Quad 1"].str.extract(r'\d+-(\d+)').astype(int)
    df["Quad 2 W"] = df["Quad 2"].str.extract(r'(\d+)-\d+').astype(int) 
    df["Quad 2 L"] = df["Quad 2"].str.extract(r'\d+-(\d+)').astype(int)
    df["Quad 3 W"] = df["Quad 3"].str.extract(r'(\d+)-\d+').astype(int) 
    df["Quad 3 L"] = df["Quad 3"].str.extract(r'\d+-(\d+)').astype(int)
    df["Quad 4 W"] = df["Quad 4"].str.extract(r'(\d+)-\d+').astype(int) 
    df["Quad 4 L"] = df["Quad 4"].str.extract(r'\d+-(\d+)').astype(int)
    df["W"] = df["Record"].str.extract(r'(\d+)-\d+').astype(int)
    df["L"] = df["Record"].str.extract(r'\d+-(\d+)').astype(int)
    df["Road W"] = df["Road"].str.extract(r'(\d+)-\d+').astype(int)
    df["Road L"] = df["Road"].str.extract(r'\d+-(\d+)').astype(int)
    df["Home W"] = df["Home"].str.extract(r'(\d+)-\d+').astype(int)
    df["Home L"] = df["Home"].str.extract(r'\d+-(\d+)').astype(int)
    df["Neutral W"] = df["Neutral"].str.extract(r'(\d+)-\d+').astype(int)
    df["Neutral L"] = df["Neutral"].str.extract(r'\d+-(\d+)').astype(int)
    df["Non-Div I W"] = df["Non-Div I"].str.extract(r'(\d+)-\d+').astype(int)
    df["Non-Div I L"] = df["Non-Div I"].str.extract(r'\d+-(\d+)').astype(int)
    df.drop(columns=["Quad 1", "Quad 2", "Quad 3", "Quad 4", "Home", "Road", "Neutral", "Record", "Non-Div I"], inplace=True)
    df.to_csv("./data/NET_ratings.csv", index=False)

def get_conference_standings(conference):
    # ------------------------------------------------------------------
    # Validate conference
    # ------------------------------------------------------------------
    if conference not in conferences:
        raise ValueError("conference is not in the list of accepted conferences")

    # ------------------------------------------------------------------
    # Keep ONLY team-perspective rows for this conference
    # (matchups_df is already one row per team per game)
    # ------------------------------------------------------------------
    conf_games = matchups_df[
        matchups_df["team_conference"] == conference
    ].copy()

    # ------------------------------------------------------------------
    # Identify conference vs conference games
    # ------------------------------------------------------------------
    conf_games["conference_game"] = (
        conf_games["team_conference"] == conf_games["opp_conference"]
    )

    # ------------------------------------------------------------------
    # Aggregate standings
    # ------------------------------------------------------------------
    standings = conf_games.groupby("team").agg(
        wins=("team_win", "sum"),
        losses=("team_win", lambda x: (1 - x).sum()),
        conference_wins=(
            "team_win",
            lambda x: x[conf_games.loc[x.index, "conference_game"]].sum()
        ),
        conference_losses=(
            "team_win",
            lambda x: (1 - x)[conf_games.loc[x.index, "conference_game"]].sum()
        )
    ).reset_index().rename(columns={"team": "Team"})

    # ------------------------------------------------------------------
    # Merge AP Poll
    # ------------------------------------------------------------------
    standings = standings.merge(ap_poll, on="Team", how="left")
    standings["rank"] = standings["rank"].fillna("NR")

    # ------------------------------------------------------------------
    # Compute win percentages (NUMERIC)
    # ------------------------------------------------------------------
    standings["conf_win_pct"] = (
        standings["conference_wins"] /
        (standings["conference_wins"] + standings["conference_losses"])
    ).fillna(0)

    standings["overall_win_pct"] = (
        standings["wins"] /
        (standings["wins"] + standings["losses"])
    ).fillna(0)

    # ------------------------------------------------------------------
    # Sort (numeric first, formatting last)
    # ------------------------------------------------------------------
    standings = standings.sort_values(
        ["conf_win_pct", "conference_losses", "overall_win_pct", "wins", "rank"],
        ascending=[False, True, False, False, True]
    ).reset_index(drop=True)

    # ------------------------------------------------------------------
    # Format percentages LAST
    # ------------------------------------------------------------------
    standings["conf_win_pct"] = standings["conf_win_pct"].map("{:.3f}".format)
    standings["overall_win_pct"] = standings["overall_win_pct"].map("{:.3f}".format)

    standings = standings.replace({np.nan, None})
    # ------------------------------------------------------------------
    # Final output
    # ------------------------------------------------------------------
    return standings[
        [
            "rank",
            "Team",
            "wins",
            "losses",
            "overall_win_pct",
            "conference_wins",
            "conference_losses",
            "conf_win_pct",
        ]
    ]

def get_top_25():
    # ------------------------------------------------------------
    # Teams / Conferences
    # ------------------------------------------------------------
    cursor.execute("SELECT team, conference FROM teams_w_conferences;")
    teams_conferences = pd.DataFrame(cursor.fetchall(), columns=["Team", "Conference"])

    result = ap_poll.merge(
        teams_conferences.drop_duplicates(),
        on="Team",
        how="left"
    )

    # ------------------------------------------------------------
    # Records (team_win / team_loss already exist)
    # ------------------------------------------------------------
    matchup_results = matchups_df[["team", "team_win", "team_loss"]]

    records = matchup_results.groupby("team").agg(
        W=("team_win", "sum"),
        L=("team_loss", "sum")
    ).reset_index().rename(columns={"team" : "Team"})

    result = result.merge(records, on="Team", how="left")

    # ------------------------------------------------------------
    # Final output
    # ------------------------------------------------------------
    final_result = (
        result.rename(columns={"rank" : "Current Rank"})
        [["Current Rank", "Team", "Conference", "W", "L"]]
        .drop_duplicates()
        .sort_values("Current Rank")
        .reset_index(drop=True)
    )

    return final_result.where(pd.notna(final_result), None)

def get_player_pg_stats(player, team=None):

    if player not in players_box_df["player"].unique():
        raise Exception("player not found in data")
    
    player_games = players_box_df[players_box_df.player == player]
    
    # If team is specified, filter to that team
    if team:
        player_games = player_games[player_games.team == team]
    
    if len(player_games) == 0:
        raise Exception(f"player {player} not found on team {team}")
    
    player_team = player_games.iloc[0]["team"]
    conference = player_games.iloc[0]["conference"]              
    pg_stats = (
        player_games
        .drop(["gameid", "date", "team", "opponent", "result", "role", "conference", "venue"], axis=1)
        .groupby("player")
        .agg("mean")
    )

    pg_stats["player"] = player
    pg_stats["team"] = player_team
    pg_stats["conference"] = conference
    pg_stats["gp"] = len(player_games[player_games.mp > 0])
    pg_stats["gs"] = len(player_games[player_games.role == "Starter"])

    col_order = ["player", "team", "conference", "gp", "gs", "mp", "pts", "fgm", "fga", "fg_pct", 
                 "fg2m", "fg2a", "fg2_pct", "fg3m", "fg3a", "fg3_pct", "ftm", "fta", "ft_pct", "orb", "drb", 
                 "trb", "ast", "stl", "blk", "tov", "pf", "gmsc"]
    
    return pg_stats[col_order].reset_index(drop=True)

def get_players_pg_stats(players):
    df = pd.DataFrame()
    for player in players:
        df = pd.concat([df, get_player_pg_stats(player)], axis=0)
    return df 

def compare_players(df, players, stats=None, figsize=(14,6), title=None):
    for p in players:
        if p not in df["player"].values:
            raise ValueError(f"{p} not found in DataFrame")

    sub = df[df["player"].isin(players)].set_index("player")

    if stats is None:
        stats = sub.select_dtypes(include=[np.number]).columns.tolist()

    pct_stats = [col for col in stats if col.endswith("_pct") or col.endswith("%")]
    raw_stats = [col for col in stats if col not in pct_stats]

    def _plot_category(stat_list, title_suffix):
        if len(stat_list) == 0:
            return

        values = sub[stat_list].astype(float)
        n_players = len(players)

        x = np.arange(len(stat_list))
        width = 0.8 / n_players

        fig, ax = plt.subplots(figsize=figsize)

        bar_containers = []

        colors = ["lightblue", "pink", "violet", "pastelgreen"]
        for i, player in enumerate(players):
            bars = ax.bar(
                x + (i - n_players/2) * width + width/2,
                values.loc[player],
                width,
                label=player,
                ec="black",
                color=colors[i]
            )
            bar_containers.append((player, bars))

        max_val = values.max().max()
        ax.set_ylim(0, 1.5 * max_val)

        for player, bars in bar_containers:
            for rect in bars:
                height = rect.get_height()
                ax.annotate(
                    f"{height:.2f}",  
                    xy=(rect.get_x() + rect.get_width() / 2, height),
                    xytext=(0, 4),  
                    textcoords="offset points",
                    ha="center",
                    va="bottom",
                    fontsize=9
                )

        ax.set_xticks(x)
        ax.set_xticklabels(stat_list, rotation=45, ha="right")
        ax.set_ylabel("Stat Value")

        final_title = (title or "Player Comparison") + f" — {title_suffix}"
        ax.set_title(final_title)
        ax.legend()

        plt.tight_layout()
        plt.show()

    _plot_category(raw_stats, "Raw Stats")

    _plot_category(pct_stats, "Percentage Stats")

def get_conference_player_pg_stat_leaders(conference, stat, n=25):
    if conference not in conferences:
        raise Exception("conference is not valid")

    if stat not in players_box_df.columns:
        raise Exception("stat is not valid")

    df = players_box_df[players_box_df["conference"] == conference].copy()

    # ------------------------------------------------
    # 1. Games played per player
    # ------------------------------------------------
    games_df = (
        df.groupby(["player", "team"])
        .agg(games_played=("gameid", "nunique"))
        .reset_index()
    )

    # ------------------------------------------------
    # 2. Team games played
    # ------------------------------------------------
    team_games_df = (
        df.groupby("team")
        .agg(team_games=("gameid", "nunique"))
        .reset_index()
    )

    games_df = games_df.merge(team_games_df, on="team", how="left")

    games_df["qualifies_games"] = (
        games_df["games_played"] >= 0.75 * games_df["team_games"]
    )

    # ------------------------------------------------
    # 3. Aggregate per-game stats
    # ------------------------------------------------
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    numeric_cols = [c for c in numeric_cols if c not in ["gameid", "date"]]

    stats_df = (
        df.groupby(["player", "team"])[numeric_cols]
        .mean()
        .reset_index()
    )

    stats_df = stats_df.merge(
        games_df[["player", "team", "games_played", "qualifies_games"]],
        on=["player", "team"],
        how="left"
    )

    # ------------------------------------------------
    # 4. Made-per-game qualification rules
    # ------------------------------------------------
    makes = (
        df.groupby(["player", "team"])
        .agg(
            FGM=("fgm", "sum"),
            FG2M=("fg2m", "sum"),
            FG3M=("fg3m", "sum"),
            FTM=("ftm", "sum")
        )
        .reset_index()
    )

    stats_df = stats_df.merge(makes, on=["player", "team"], how="left")

    if stat in ["fg2_pct", "fg3_pct"]:
        stats_df = stats_df[
            stats_df[f"fg{stat[2]}m"] >= 2 * stats_df["games_played"]
        ]

    elif stat == "ft_pct":
        stats_df = stats_df[
            stats_df["ftm"] >= 2 * stats_df["games_played"]
        ]

    elif stat == "fg_pct":
        stats_df = stats_df[
            stats_df["fgm"] >= 4 * stats_df["games_played"]
        ]

    # ------------------------------------------------
    # 5. Apply games-played rule
    # ------------------------------------------------
    stats_df = stats_df[stats_df["qualifies_games"]]

    # ------------------------------------------------
    # 6. Rank leaders
    # ------------------------------------------------
    leaders = (
        stats_df
        .sort_values(stat, ascending=False)
        .head(int(n))
        .reset_index(drop=True)
    )

    leaders["rank"] = np.arange(1, len(leaders) + 1)
    leaders[stat] = leaders[stat].map("{:.3f}".format)

    return leaders[["rank", "player", "team", stat]]

def get_conference_player_pg_stat_rank(conference, stat, player):
    if stat not in players_box_df.columns:
        raise Exception(f"{stat} is not valid")

    id_cols = ["player", "team", "conference"]

    df = players_box_df[players_box_df.conference.eq(conference)].copy()

    # -----------------------------
    # 1. Games played per player
    # -----------------------------
    games_df = (
        df.groupby(["player", "team"])
        .agg(games_played=("gameid", "nunique"))
        .reset_index()
    )

    # -----------------------------
    # 2. Team games played
    # -----------------------------
    team_games_df = (
        df.groupby("team")
        .agg(team_games=("gameid", "nunique"))
        .reset_index()
    )

    games_df = games_df.merge(team_games_df, on="team", how="left")

    # 75% team games rule
    games_df["qualifies_games"] = (
        games_df["games_played"] >= 0.75 * games_df["team_games"]
    )

    # -----------------------------
    # 3. Aggregate player stats
    # -----------------------------
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    numeric_cols = [c for c in numeric_cols if c not in ["gameid", "date"]]

    stats_df = (
        df[id_cols + numeric_cols]
        .groupby(id_cols)[numeric_cols]
        .mean()
        .reset_index()
    )

    stats_df = stats_df.merge(
        games_df[["player", "team", "games_played", "qualifies_games"]],
        on=["player", "team"],
        how="left"
    )

    # -----------------------------
    # 4. Percentage qualification rules
    # -----------------------------


    if stat == "fg_pct":
        total_fgm = df.groupby(["player", "team"])["fgm"].sum().reset_index()
        stats_df = stats_df.drop("fgm", axis=1).merge(total_fgm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["fgm"] >= 4 * stats_df["games_played"]
        ]

    elif stat == "fg2_pct":
        total_tpm = df.groupby(["player", "team"])["fg2m"].sum().reset_index()
        stats_df = stats_df.drop("fg2m", axis=1).merge(total_tpm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["fg2m"] >= 2 * stats_df["games_played"]
        ]

    elif stat == "fg3_pct":
        total_tpm = df.groupby(["player", "team"])["fg3m"].sum().reset_index()
        stats_df = stats_df.drop("fg3m", axis=1).merge(total_tpm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["fg3m"] >= 2 * stats_df["games_played"]
        ]

    elif stat == "ft_pct":
        total_ftm = df.groupby(["player", "team"])["ftm"].sum().reset_index()
        stats_df = stats_df.drop("ftm", axis=1).merge(total_ftm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["ftm"] >= 2 * stats_df["games_played"]
        ]

    # -----------------------------
    # 5. Apply games-played filter
    # -----------------------------
    stats_df = stats_df[stats_df["qualifies_games"]]

    # -----------------------------
    # 6. Rank leaders
    # -----------------------------
    leaders = (
        stats_df
        .sort_values(stat, ascending=False)
        .reset_index(drop=True)
    )

    leaders["rank"] = np.arange(1, len(leaders) + 1)
    leaders[stat] = leaders[stat].map("{:.3f}".format)

    rank = leaders[leaders.player == player]["rank"].iloc[0]
    return jsonify({"Rank" : int(rank)})

def get_national_player_pg_stat_leaders(stat, n=25):
    if stat not in players_box_df.columns:
        raise Exception("stat is not valid")

    id_cols = ["player", "team", "conference"]

    df = players_box_df[players_box_df.conference.ne("Not D1")].copy()

    # -----------------------------
    # 1. Games played per player
    # -----------------------------
    games_df = (
        df.groupby(["player", "team"])
        .agg(games_played=("gameid", "nunique"))
        .reset_index()
    )

    # -----------------------------
    # 2. Team games played
    # -----------------------------
    team_games_df = (
        df.groupby("team")
        .agg(team_games=("gameid", "nunique"))
        .reset_index()
    )

    games_df = games_df.merge(team_games_df, on="team", how="left")

    # 75% team games rule
    games_df["qualifies_games"] = (
        games_df["games_played"] >= 0.75 * games_df["team_games"]
    )

    # -----------------------------
    # 3. Aggregate player stats
    # -----------------------------
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    numeric_cols = [c for c in numeric_cols if c not in ["gameid", "date"]]

    stats_df = (
        df[id_cols + numeric_cols]
        .groupby(id_cols)[numeric_cols]
        .mean()
        .reset_index()
    )

    stats_df = stats_df.merge(
        games_df[["player", "team", "games_played", "qualifies_games"]],
        on=["player", "team"],
        how="left"
    )

    # -----------------------------
    # 4. Percentage qualification rules
    # -----------------------------


    if stat == "fg_pct":
        total_fgm = df.groupby(["player", "team"])["fgm"].sum().reset_index()
        stats_df = stats_df.drop("fgm", axis=1).merge(total_fgm, on=["player", "team"])
        print(stats_df.columns)
        stats_df = stats_df[
            stats_df["fgm"] >= 4 * stats_df["games_played"]
        ]

    elif stat == "fg2_pct":
        total_tpm = df.groupby(["player", "team"])["fg2m"].sum().reset_index()
        stats_df = stats_df.drop("fg2m", axis=1).merge(total_tpm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["fg2m"] >= 2 * stats_df["games_played"]
        ]

    elif stat == "fg3_pct":
        total_tpm = df.groupby(["player", "team"])["fg3m"].sum().reset_index()
        stats_df = stats_df.drop("fg3m", axis=1).merge(total_tpm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["fg3m"] >= 2 * stats_df["games_played"]
        ]

    elif stat == "ft_pct":
        total_ftm = df.groupby(["player", "team"])["ftm"].sum().reset_index()
        stats_df = stats_df.drop("ftm", axis=1).merge(total_ftm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["ftm"] >= 2 * stats_df["games_played"]
        ]

    # -----------------------------
    # 5. Apply games-played filter
    # -----------------------------
    stats_df = stats_df[stats_df["qualifies_games"]]

    # -----------------------------
    # 6. Rank leaders
    # -----------------------------
    leaders = (
        stats_df
        .sort_values(stat, ascending=False)
        .head(n)
        .reset_index(drop=True)
    )

    leaders["rank"] = np.arange(1, len(leaders) + 1)
    leaders[stat] = leaders[stat].map("{:.3f}".format)

    return leaders[["rank", "player", "team", "conference", stat]]

def get_national_player_pg_stat_rank(stat, player):
    if stat not in players_box_df.columns:
        raise Exception("stat is not valid")

    id_cols = ["player", "team", "conference"]

    df = players_box_df[players_box_df.conference.ne("Not D1")].copy()

    # -----------------------------
    # 1. Games played per player
    # -----------------------------
    games_df = (
        df.groupby(["player", "team"])
        .agg(games_played=("gameid", "nunique"))
        .reset_index()
    )

    # -----------------------------
    # 2. Team games played
    # -----------------------------
    team_games_df = (
        df.groupby("team")
        .agg(team_games=("gameid", "nunique"))
        .reset_index()
    )

    games_df = games_df.merge(team_games_df, on="team", how="left")

    # 75% team games rule
    games_df["qualifies_games"] = (
        games_df["games_played"] >= 0.75 * games_df["team_games"]
    )

    # -----------------------------
    # 3. Aggregate player stats
    # -----------------------------
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    numeric_cols = [c for c in numeric_cols if c not in ["gameid", "date"]]

    stats_df = (
        df[id_cols + numeric_cols]
        .groupby(id_cols)[numeric_cols]
        .mean()
        .reset_index()
    )

    stats_df = stats_df.merge(
        games_df[["player", "team", "games_played", "qualifies_games"]],
        on=["player", "team"],
        how="left"
    )

    # -----------------------------
    # 4. Percentage qualification rules
    # -----------------------------


    if stat == "fg_pct":
        total_fgm = df.groupby(["player", "team"])["fgm"].sum().reset_index()
        stats_df = stats_df.drop("fgm", axis=1).merge(total_fgm, on=["player", "team"])
        print(stats_df.columns)
        stats_df = stats_df[
            stats_df["fgm"] >= 4 * stats_df["games_played"]
        ]

    elif stat == "fg2_pct":
        total_tpm = df.groupby(["player", "team"])["fg2m"].sum().reset_index()
        stats_df = stats_df.drop("fg2m", axis=1).merge(total_tpm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["fg2m"] >= 2 * stats_df["games_played"]
        ]

    elif stat == "fg3_pct":
        total_tpm = df.groupby(["player", "team"])["fg3m"].sum().reset_index()
        stats_df = stats_df.drop("fg3m", axis=1).merge(total_tpm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["fg3m"] >= 2 * stats_df["games_played"]
        ]

    elif stat == "ft_pct":
        total_ftm = df.groupby(["player", "team"])["ftm"].sum().reset_index()
        stats_df = stats_df.drop("ftm", axis=1).merge(total_ftm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["ftm"] >= 2 * stats_df["games_played"]
        ]

    # -----------------------------
    # 5. Apply games-played filter
    # -----------------------------
    stats_df = stats_df[stats_df["qualifies_games"]]

    # -----------------------------
    # 6. Rank leaders
    # -----------------------------
    leaders = (
        stats_df
        .sort_values(stat, ascending=False)
        .reset_index(drop=True)
    )

    leaders["rank"] = np.arange(1, len(leaders) + 1)
    leaders[stat] = leaders[stat].map("{:.3f}".format)

    rank = leaders[leaders.player == player]["rank"].iloc[0]
    return jsonify({"Rank" : int(rank)})

def get_team_pg_stats(team):
    
    if team not in matchups_df["team"].unique():
        raise Exception("team not found in data")
    
    team_games = (
        matchups_df[matchups_df.team == team]
        [["team", "team_conference", "team_win", "team_loss", "team_pts", "team_trb", "team_orb", "team_drb", 
          "team_ast", "team_stl", "team_blk", "team_tov", "team_fga", "team_fgm", "team_fg2m", "team_fg2a", "team_fg3m", "team_fg3a", 
          "team_ftm", "team_fta", "team_pf", "team_poss", "team_ortg", "team_drtg", "team_netrtg", "opponent_pts", 
          "opponent_trb", "opponent_orb", "opponent_drb", "opponent_ast", "opponent_stl", 
          "opponent_blk", "opponent_tov", "opponent_fga", "opponent_fgm", "opponent_fg2m", 
          "opponent_fg2a", "opponent_fg3m", "opponent_fg3a", "opponent_ftm", "opponent_fta", "opponent_pf"
        ]]
    )
                                            
    numeric_cols = [i for i in team_games.columns if i not in ["team", "team_conference"]]

    df = (
        team_games
        .groupby(["team", "team_conference"])[numeric_cols]
        .agg({**{k : "mean" for k in numeric_cols}, "team_win" : "sum", "team_loss" : "sum"})
        .reset_index()
    )

    df = df.rename(columns={
        "opponent_pts" : "pts_allowed",
        "opponent_trb" : "trb_allowed",
        "opponent_orb" : "orb_allowed",
        "opponent_drb" : "drb_allowed",
        "opponent_ast" : "ast_allowed",
        "opponent_stl" : "stl_allowed",
        "opponent_blk" : "shots_blocked",
        "opponent_tov" : "forced_tov",
        "opponent_fga" : "fga_allowed",
        "opponent_fgm" : "fgm_allowed", 
        "opponent_fg2m" : "fg2m_allowed",
        "opponent_fg2a" : "fg2a_allowed",
        "opponent_fg3m" : "fg3m_allowed",
        "opponent_fg3a" : "fg3a_allowed",
        "opponent_ftm" : "ftm_allowed",
        "opponent_fta" : "fta_allowed",
        "opponent_pf" : "pf_drawn",
        "team_win" : "W", 
        "team_loss" : "L"
    })

    df["team_fg2_pct"] = df["team_fg2m"] / df["team_fg2a"]
    df["team_fg3_pct"] = df["team_fg3m"] / df["team_fg3a"]
    df["team_ft_pct"] = df["team_ftm"] / df["team_fta"]
    df["team_fg_pct"] = df["team_fgm"] / df["team_fga"]
    df["fg2_pct_allowed"] = df["fg2m_allowed"] / df["fg2a_allowed"]
    df["fg3_pct_allowed"] = df["fg3m_allowed"] / df["fg3a_allowed"]
    df["ft_pct_allowed"] = df["ftm_allowed"] / df["fta_allowed"]
    df["fg_pct_allowed"] = df["fgm_allowed"] / df["fga_allowed"]
    df["gp"] = [len(team_games)]

    numeric_cols = [i for i in df.columns if i not in ["team", "team_conference", "W", "L", "gp"]]

    df[numeric_cols] = df[numeric_cols].map("{:.3f}".format)

    return df

def get_teams_pg_stats(teams):
    df = pd.DataFrame()
    for team in teams:
        df = pd.concat([df, get_team_pg_stats(team)], axis=0)
    return df 

def compare_teams(df, teams, stats=None, figsize=(14,6), title=None, colors=None):
    for t in teams:
        if t not in df["team"].values:
            raise ValueError(f"{t} not found in DataFrame")

    sub = df[df["team"].isin(teams)].set_index("team")

    if stats is None:
        stats = sub.select_dtypes(include=[np.number]).columns.tolist()

    pct_stats = [col for col in stats if col.endswith("%") or col.endswith("_pct") or col.endswith("%_allowed") or col.endswith("_pct_allowed")]
    raw_stats = [col for col in stats if col not in pct_stats]

    def _plot_category(stat_list, title_suffix, colors):
        if len(stat_list) == 0:
            return

        values = sub[stat_list].astype(float)
        n_teams = len(teams)

        x = np.arange(len(stat_list))
        width = 0.8 / n_teams

        fig, ax = plt.subplots(figsize=figsize)

        bar_containers = []

        if not colors:
            colors = ["lightblue", "pink", "violet", "pastelgreen"]
        for i, team in enumerate(teams):
            bars = ax.bar(
                x + (i - n_teams/2) * width + width/2,
                values.loc[team],
                width,
                label=team,
                ec="black",
                color=colors[i]
            )
            bar_containers.append((team, bars))

        max_val = values.max().max()
        ax.set_ylim(0, 1.5 * max_val)

        for team, bars in bar_containers:
            for rect in bars:
                height = rect.get_height()
                ax.annotate(
                    f"{height:.2f}",  
                    xy=(rect.get_x() + rect.get_width() / 2, height),
                    xytext=(0, 4),  
                    textcoords="offset points",
                    ha="center",
                    va="bottom",
                    fontsize=9
                )

        ax.set_xticks(x)
        ax.set_xticklabels(stat_list, rotation=45, ha="right")
        ax.set_ylabel("Stat Value")

        final_title = (title or "Team Comparison") + f" — {title_suffix}"
        ax.set_title(final_title)
        ax.legend()

        plt.tight_layout()
        plt.show()

    _plot_category(raw_stats, "Raw Stats", colors)

    _plot_category(pct_stats, "Percentage Stats", colors)

def get_conference_team_pg_stat_leaders(conference, stat):
    if conference not in conferences:
        raise Exception("conference or stat is not valid")

    teams = matchups_df[matchups_df.team_conference == conference]["team"].unique()

    df = get_teams_pg_stats(teams)

    df[stat] = df[stat].astype("float")

    df = (
        df
        .sort_values(stat, ascending=("_allowed" in stat or stat == "shots_blocked" or stat == "team_tov"))
        .loc[:, ["team", stat]]
    )
    df["rank"] = np.arange(1, len(df) + 1)

    return df[["rank", "team", stat]]

def get_conference_team_pg_stat_rank(conference, team, stat):
    id_cols = ["team", "team_conference"]

    numeric_cols = matchups_df.select_dtypes(include="number").columns.tolist()

    numeric_cols = [c for c in numeric_cols if c not in ["gameid", "date"]]

    df = (
        matchups_df[matchups_df.team_conference == conference][id_cols + numeric_cols]
        .groupby(["team", "team_conference"])[numeric_cols]
        .mean()
        .rename(columns={
            "opponent_pts" : "pts_allowed",
            "opponent_trb" : "trb_allowed",
            "opponent_orb" : "orb_allowed",
            "opponent_drb" : "drb_allowed",
            "opponent_ast" : "ast_allowed",
            "opponent_stl" : "stl_allowed",
            "opponent_blk" : "shots_blocked",
            "opponent_tov" : "forced_tov",
            "opponent_fga" : "fga_allowed",
            "opponent_fgm" : "fgm_allowed", 
            "opponent_fg2m" : "fg2m_allowed",
            "opponent_fg2a" : "fg2a_allowed",
            "opponent_fg3m" : "fg3m_allowed",
            "opponent_fg3a" : "fg3a_allowed",
            "opponent_ftm" : "ftm_allowed",
            "opponent_fta" : "fta_allowed",
            "opponent_pf" : "pf_drawn",
            "team_win" : "W", 
            "team_loss" : "L"
        })
        .reset_index()
    )

    df["team_fg2_pct"] = df["team_fg2m"] / df["team_fg2a"]
    df["team_fg3_pct"] = df["team_fg3m"] / df["team_fg3a"]
    df["team_ft_pct"] = df["team_ftm"] / df["team_fta"]
    df["team_fg_pct"] = df["team_fgm"] / df["team_fga"]
    df["fg2_pct_allowed"] = df["fg2m_allowed"] / df["fg2a_allowed"]
    df["fg3_pct_allowed"] = df["fg3m_allowed"] / df["fg3a_allowed"]
    df["ft_pct_allowed"] = df["ftm_allowed"] / df["fta_allowed"]
    df["fg_pct_allowed"] = df["fgm_allowed"] / df["fga_allowed"]
    df = df.sort_values(stat, ascending=("_allowed" in stat or 'blocked' in stat))
    df["rank"] = np.arange(1, len(df)+1)

    found_rank = df[df.team == team]["rank"].iloc[0]

    return {"Rank" : int(found_rank)}

def get_national_team_pg_stat_leaders(stat, n=25, find_rank=None):
    id_cols = ["team", "team_conference"]

    numeric_cols = matchups_df.select_dtypes(include="number").columns.tolist()

    numeric_cols = [c for c in numeric_cols if c not in ["gameid", "date"]]

    df = (
        matchups_df[matchups_df.team_conference != "Not D1"][id_cols + numeric_cols]
        .groupby(["team", "team_conference"])[numeric_cols]
        .mean()
        .rename(columns={
            "opponent_pts" : "pts_allowed",
            "opponent_trb" : "trb_allowed",
            "opponent_orb" : "orb_allowed",
            "opponent_drb" : "drb_allowed",
            "opponent_ast" : "ast_allowed",
            "opponent_stl" : "stl_allowed",
            "opponent_blk" : "shots_blocked",
            "opponent_tov" : "forced_tov",
            "opponent_fga" : "fga_allowed",
            "opponent_fgm" : "fgm_allowed", 
            "opponent_fg2m" : "fg2m_allowed",
            "opponent_fg2a" : "fg2a_allowed",
            "opponent_fg3m" : "fg3m_allowed",
            "opponent_fg3a" : "fg3a_allowed",
            "opponent_ftm" : "ftm_allowed",
            "opponent_fta" : "fta_allowed",
            "opponent_pf" : "pf_drawn",
            "team_win" : "W", 
            "team_loss" : "L"
        })
        .reset_index()
    )

    df["team_fg2_pct"] = df["team_fg2m"] / df["team_fg2a"]
    df["team_fg3_pct"] = df["team_fg3m"] / df["team_fg3a"]
    df["team_ft_pct"] = df["team_ftm"] / df["team_fta"]
    df["team_fg_pct"] = df["team_fgm"] / df["team_fga"]
    df["fg2_pct_allowed"] = df["fg2m_allowed"] / df["fg2a_allowed"]
    df["fg3_pct_allowed"] = df["fg3m_allowed"] / df["fg3a_allowed"]
    df["ft_pct_allowed"] = df["ftm_allowed"] / df["fta_allowed"]
    df["fg_pct_allowed"] = df["fgm_allowed"] / df["fga_allowed"]
    ascending = ("_allowed" in stat or "_blocked" in stat or stat == "team_tov")
    print(ascending)
    df = df.sort_values(stat, ascending=ascending)
    df["rank"] = np.arange(1, len(df)+1)
    sliced_df = df.loc[:, ["rank", "team", "team_conference", stat]].head(n)
    sliced_df[stat] = df[stat].map("{:.3f}".format)
    
    if find_rank and not isinstance(find_rank, list):
        found_rank = df[df.team == find_rank]["rank"].iloc[0]
        print(f"{stat} rank for {find_rank}: {found_rank}")
    elif find_rank and isinstance(find_rank, list):
        for team in find_rank:
            found_rank = df[df.team == team]["rank"].iloc[0]
            print(f"{stat} rank for {team}: {found_rank}")

    return sliced_df.reset_index(drop=True)

def get_national_team_pg_stat_rank(stat, team):
    id_cols = ["team", "team_conference"]

    numeric_cols = matchups_df.select_dtypes(include="number").columns.tolist()

    numeric_cols = [c for c in numeric_cols if c not in ["gameid", "date"]]

    df = (
        matchups_df[matchups_df.team_conference != "Not D1"][id_cols + numeric_cols]
        .groupby(["team", "team_conference"])[numeric_cols]
        .mean()
        .rename(columns={
            "opponent_pts" : "pts_allowed",
            "opponent_trb" : "trb_allowed",
            "opponent_orb" : "orb_allowed",
            "opponent_drb" : "drb_allowed",
            "opponent_ast" : "ast_allowed",
            "opponent_stl" : "stl_allowed",
            "opponent_blk" : "shots_blocked",
            "opponent_tov" : "forced_tov",
            "opponent_fga" : "fga_allowed",
            "opponent_fgm" : "fgm_allowed", 
            "opponent_fg2m" : "fg2m_allowed",
            "opponent_fg2a" : "fg2a_allowed",
            "opponent_fg3m" : "fg3m_allowed",
            "opponent_fg3a" : "fg3a_allowed",
            "opponent_ftm" : "ftm_allowed",
            "opponent_fta" : "fta_allowed",
            "opponent_pf" : "pf_drawn",
            "team_win" : "W", 
            "team_loss" : "L"
        })
        .reset_index()
    )

    df["team_fg2_pct"] = df["team_fg2m"] / df["team_fg2a"]
    df["team_fg3_pct"] = df["team_fg3m"] / df["team_fg3a"]
    df["team_ft_pct"] = df["team_ftm"] / df["team_fta"]
    df["team_fg_pct"] = df["team_fgm"] / df["team_fga"]
    df["fg2_pct_allowed"] = df["fg2m_allowed"] / df["fg2a_allowed"]
    df["fg3_pct_allowed"] = df["fg3m_allowed"] / df["fg3a_allowed"]
    df["ft_pct_allowed"] = df["ftm_allowed"] / df["fta_allowed"]
    df["fg_pct_allowed"] = df["fgm_allowed"] / df["fga_allowed"]
    df = df.sort_values(stat, ascending=("_allowed" in stat or "_blocked" in stat))
    df["rank"] = np.arange(1, len(df)+1)

    found_rank = df[df.team == team]["rank"].iloc[0]

    return jsonify({"Rank" : int(found_rank)})

def compute_all_team_ratings():
    all_teams = matchups_df["team"].unique()

    NatAvgOE = matchups_df["team_ortg"].mean()
    NatAvgDE = matchups_df["team_drtg"].mean()

    team_ratings = {
        t: {"AdjO": NatAvgOE, "AdjD": NatAvgDE}
        for t in all_teams
    }

    def compute_adjusted_efficiencies():
        new = {}
        for t in all_teams:
            games = matchups_df[matchups_df.team == t]

            adjO = []
            adjD = []

            for _, g in games.iterrows():
                opp = g.opponent
                if opp not in team_ratings:
                    continue

                adjO.append(g.team_ortg * (NatAvgOE / team_ratings[opp]["AdjD"]))
                adjD.append(g.team_drtg * (NatAvgOE / team_ratings[opp]["AdjO"]))

            new[t] = {
                "AdjO": np.mean(adjO) if adjO else NatAvgOE,
                "AdjD": np.mean(adjD) if adjD else NatAvgDE
            }
        return new

    # iterate 25–30 times
    for _ in range(30):
        team_ratings = compute_adjusted_efficiencies()

    # Add Pyth rating
    x = 10.25
    for t in all_teams:
        O = team_ratings[t]["AdjO"]
        D = team_ratings[t]["AdjD"]
        team_ratings[t]["Pyth"] = (O**x) / (O**x + D**x)

    return team_ratings

def get_team_sos(team, team_ratings):
    x = 10.25

    opps = matchups_df.loc[matchups_df.team == team, "opponent"]
    adjO = [team_ratings[o]["AdjO"] for o in opps if o in team_ratings]
    adjD = [team_ratings[o]["AdjD"] for o in opps if o in team_ratings]

    sos_AdjO = np.mean(adjO)
    sos_AdjD = np.mean(adjD)
    sos_Pyth = (sos_AdjO**x) / (sos_AdjO**x + sos_AdjD**x)

    return float(sos_Pyth)

def get_national_sos_rankings(team_ratings, n=25, top_n_net=50, sort_by="SOS", find_rank=None):

    df = matchups_df.loc[matchups_df.team_conference != "Not D1", ["team", "team_conference"]].drop_duplicates()

    df["sos"] = df["team"].apply(lambda t: get_team_sos(t, team_ratings))

    rating_df = pd.DataFrame([
        {"Team": t,
         "AdjEM": team_ratings[t]["AdjO"] - team_ratings[t]["AdjD"]}
        for t in team_ratings
    ])

    rating_df = rating_df.sort_values("AdjEM", ascending=False)
    topN_teams = set(rating_df["Team"].iloc[:top_n_net])

    def count_topN_opponents(team):
        opponents = matchups_df.loc[matchups_df.team == team, "opponent"]
        return sum(o in topN_teams for o in opponents)

    df[f"top{top_n_net}_opp_count"] = df["team"].apply(count_topN_opponents)


    df = df.sort_values("sos" if sort_by=="SOS" else f"Top{top_n_net}_Opp_Count", ascending=False)
    df["rank"] = np.arange(1, len(df) + 1)

    if find_rank and isinstance(find_rank, list):
        found_ranks = {}
        for team in find_rank:
            found_rank = df[df.team == team]["rank"].iloc[0]
            found_ranks[team] = found_rank
            
        return df[["rank", "team", "team_conference", "sos", f"top{top_n_net}_opp_count"]].iloc[:n].reset_index(drop=True), found_ranks
    
    return df[["rank", "team", "team_conference", "sos", f"top{top_n_net}_opp_count"]].iloc[:n].reset_index(drop=True)

def player_pg_performance_filter(filter_dict):
    id_cols = ["player", "team", "conference"]
    
    # numeric columns excluding GameID and Date
    numeric_cols = players_box_df.select_dtypes(include="number").columns.tolist()
    numeric_cols = [c for c in numeric_cols if c not in ["gameid", "date"]]

    # --- Compute GS (games started) per player BEFORE groupby ---
    gs = (
        players_box_df
        .groupby("player")["role"]
        .apply(lambda x: (x == "Starter").sum())
        .rename("gs")
    )

    # --- Build per-game averages ---
    df = (
        players_box_df[id_cols + numeric_cols]
        .groupby(["player", "team", "conference"])[numeric_cols]
        .mean()
        .reset_index()
    )

    # Add GS as a column
    df = df.merge(gs, on="player", how="left")

    # --- Build boolean mask ---
    mask = pd.Series(True, index=df.index)

    for col, condition in filter_dict.items():
        op, value = condition
        if op == ">":
            mask &= df[col] > value
        elif op == ">=":
            mask &= df[col] >= value
        elif op == "<":
            mask &= df[col] < value
        elif op == "<=":
            mask &= df[col] <= value
        elif op == "==":
            mask &= df[col] == value
        elif op == "!=":
            mask &= df[col] != value
        else:
            raise ValueError(f"Unsupported operator: {op}")

    df = df[mask].reset_index(drop=True)

    # Format numeric columns
    df[numeric_cols] = df[numeric_cols].map("{:.3f}".format)

    return df[["player", "team", "conference"] + list(filter_dict.keys())].sort_values("team")

def get_team_player_pg_stat_leaders(team, stat):
    if team not in matchups_df["team"].unique() or stat not in players_box_df.columns:
        raise Exception("Team or stat is not valid")

    players = players_box_df[players_box_df.team == team]["player"].unique()

    df = get_players_pg_stats(players)

    df[stat] = df[stat].astype("float")

    df = (
        df
        .sort_values(stat, ascending=False)
        .loc[:, ["player", stat]]
    )
    df[stat] = df[stat].map("{:.3f}".format)
    df["rank"] = np.arange(1, len(df) + 1)

    return df[["rank", "player", stat]]

def get_team_player_pg_stat_rank(team, stat, player):
    if stat not in players_box_df.columns:
        raise Exception("stat is not valid")

    id_cols = ["player", "team", "conference"]

    df = players_box_df[players_box_df.team.eq(team)].copy()

    # -----------------------------
    # 1. Games played per player
    # -----------------------------
    games_df = (
        df.groupby(["player", "team"])
        .agg(games_played=("gameid", "nunique"))
        .reset_index()
    )

    # -----------------------------
    # 2. Team games played
    # -----------------------------
    team_games_df = (
        df.groupby("team")
        .agg(team_games=("gameid", "nunique"))
        .reset_index()
    )

    games_df = games_df.merge(team_games_df, on="team", how="left")

    # 75% team games rule
    games_df["qualifies_games"] = (
        games_df["games_played"] >= 0.75 * games_df["team_games"]
    )

    # -----------------------------
    # 3. Aggregate player stats
    # -----------------------------
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    numeric_cols = [c for c in numeric_cols if c not in ["gameid", "date"]]

    stats_df = (
        df[id_cols + numeric_cols]
        .groupby(id_cols)[numeric_cols]
        .mean()
        .reset_index()
    )

    stats_df = stats_df.merge(
        games_df[["player", "team", "games_played", "qualifies_games"]],
        on=["player", "team"],
        how="left"
    )

    # -----------------------------
    # 4. Percentage qualification rules
    # -----------------------------


    if stat == "fg_pct":
        total_fgm = df.groupby(["player", "team"])["fgm"].sum().reset_index()
        stats_df = stats_df.drop("fgm", axis=1).merge(total_fgm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["fgm"] >= 4 * stats_df["games_played"]
        ]

    elif stat == "fg2_pct":
        total_tpm = df.groupby(["player", "team"])["fg2m"].sum().reset_index()
        stats_df = stats_df.drop("fg2m", axis=1).merge(total_tpm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["fg2m"] >= 2 * stats_df["games_played"]
        ]

    elif stat == "fg3_pct":
        total_tpm = df.groupby(["player", "team"])["fg3m"].sum().reset_index()
        stats_df = stats_df.drop("fg3m", axis=1).merge(total_tpm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["fg3m"] >= 2 * stats_df["games_played"]
        ]

    elif stat == "ft_pct":
        total_ftm = df.groupby(["player", "team"])["ftm"].sum().reset_index()
        stats_df = stats_df.drop("ftm", axis=1).merge(total_ftm, on=["player", "team"])
        stats_df = stats_df[
            stats_df["ftm"] >= 2 * stats_df["games_played"]
        ]

    # -----------------------------
    # 5. Apply games-played filter
    # -----------------------------
    stats_df = stats_df[stats_df["qualifies_games"]]

    # -----------------------------
    # 6. Rank leaders
    # -----------------------------
    leaders = (
        stats_df
        .sort_values(stat, ascending=False)
        .reset_index(drop=True)
    )

    leaders["rank"] = np.arange(1, len(leaders) + 1)
    leaders[stat] = leaders[stat].map("{:.3f}".format)

    rank = leaders[leaders.player == player]["rank"].iloc[0]
    return {"Rank" : int(rank)}

def show_bracketology():
    national_sos_rankings = get_national_sos_rankings(team_ratings)
    national_sos_rankings = national_sos_rankings.rename(columns={'rank' : 'sos_rank'}).drop('team_conference', axis=1)

    net_ratings = NET_ratings.rename(columns={
        "Rank" : "rank",
        "School" : "school",
        "Conference" : "conference",
        "Previous" : "previous",
        "Quad 1 W" : "quad1_w",
        "Quad 1 L" : "quad1_l",
        "Quad 2 W" : "quad2_w",
        "Quad 2 L" : "quad2_l",
        "Quad 3 W" : "quad3_w",
        "Quad 3 L" : "quad3_l",
        "Quad 4 W" : "quad4_w",
        "Quad 4 L" : "quad4_l",
        "W" : "w", 
        "L" : "l",
        "Road W" : "road_w",
        "Road L" : "road_l",
        "Home W" : "home_w",
        "Home L" : "home_l",
        "Neutral W" : "neutral_w",
        "Neutral L" : "neutral_l",
        "Non-Div I W" : "non_div1_w",
        "Non-Div I L" : "non_div1_l"
    })

    conferences = net_ratings.conference.unique()
    conferences = [i for i in conferences if i not in ['SoCon', 'Summit League', 'Patriot']]

    conferences.append('Southern')
    conferences.append('Summit')
    conferences.append('Patriot League')

    net_ratings["w_pct"] = net_ratings["w"] / (net_ratings["w"] + net_ratings["l"])

    conf_standings = pd.DataFrame()
    for conf in conferences:
        this_conf = get_conference_standings(conf)
        this_conf['conference'] = conf
        conf_standings = pd.concat([conf_standings, this_conf], axis=0)

    net_ratings['school'] = net_ratings['school'].str.replace(' St.', ' State')
    net_ratings['school'] = net_ratings['school'].str.replace(' Ky.', ' Kentucky')
    net_ratings['school'] = net_ratings['school'].str.replace('Ga.', 'Georgia')
    net_ratings['school'] = net_ratings['school'].str.replace('Fla.', 'Florida')
    net_ratings['school'] = net_ratings['school'].str.replace('Mich.', 'Michigan')

    name_mapping = {
        "North Carolina" : "UNC",
        "Southern California" : "USC",
        "McNeese" : "McNeese State",
        "Seattle U" : "Seattle",
        "UNI" : "Northern Iowa",
        "Pittsburgh" : "Pitt",
        "McNeese" : "McNeese State",
        "Middle Tenn." : "Middle Tennessee",
        "Saint Mary's (CA)" : "Saint Mary's",
        "UC San Diego" : "UC-San Diego",
        "SFA" : "Stephen F. Austin",
        "LMU (CA)" : "Loyola Marymount",
        "UNCW" : "UNC Wilmington",
        "UC Irvine" : "UC-Irvine",
        "UC Davis" : "UC-Davis",
        "St. Thomas (MN)" : "St. Thomas",
        "Southern Ill." : "Southern Illinois",
        "Northern Colo." : "Northern Colorado",
        "UC Santa Barbara" : "UCSB",
        "Southern Miss." : "Southern Miss",
        "UT Martin" : "UT-Martin",
        "Col. of Charleston" : "College of Charleston",
        "Massachusetts" : "UMass",
        "FIU" : "Florida International",
        "UTRGV" : "Texas-Rio Grande Valley",
        "UIW" : "Incarnate Word",
        "Charleston So." : "Charleston Southern",
        "Nicholls" : "Nicholls State",
        "A&M-Corpus Christi" : "Texas A&M-Corpus Christi",
        "FGCU" : "Florida Gulf Coast",
        "Southeast Mo. State" : "Southeast Missouri State",
        "CSUN" : "Cal State Northridge",
        "Central Ark." : "Central Arkansas",
        "App State" : "Appalachian State",
        "Central Conn. State" : "Central Connecticut",
        "Lamar University" : "Lamar",
        "Saint Joseph's" : "St. Joseph's",
        "UC Riverside" : "UC-Riverside",
        "SIUE" : "SIU-Edwardsville",
        "Northern Ariz." : "Northern Arizona",
        "Boston U." : "Boston University",
        "Eastern Wash." : "Eastern Washington",
        "N.C. A&T" : "North Carolina A&T",
        "Saint Peter's" : "St. Peter's",
        "Western Caro." : "Western Carolina",
        "Southeastern La." : "Southeastern Louisiana",
        "Army West Point" : "Army",
        "Southern U." : "Southern",
        "Ark.-Pine Bluff" : "Arkansas-Pine Bluff",
        "North Ala." : "North Alabama",
        "CSU Bakersfield" : "Cal State Bakersfield",
        "Eastern Ill." : "Eastern Illinois",
        "Loyola Chicago" : "Loyola (IL)",
        "Alcorn" : "Alcorn State",
        "Mount State Mary's" : "Mount St. Mary's",
        "NIU" : "Northern Illinois",
        "UAlbany" : "Albany (NY)",
        "UMass Lowell" : "UMass-Lowell",
        "IU Indy" : "IU Indianapolis",
        "UMES" : "Maryland-Eastern Shore",
        "Southern Ind." : "Southern Indiana",
        "Western Ill." : "Western Illinois",
        "Loyola Maryland" : "Loyola (MD)",
        "N.C. Central" : "North Carolina Central",
        "ULM" : "Louisiana-Monroe",
        "Saint Francis" : "Saint Francis (PA)",
        "Mississippi Val." : "Mississippi Valley State"
    }

    net_ratings['school'] = net_ratings['school'].replace(name_mapping)

    conf_standings = conf_standings.rename(columns={'rank' : 'ap_rank'})

    conf_standings = conf_standings.drop(["wins", "losses", "overall_win_pct"], axis=1)

    conf_standings['conf_rank'] = (
        conf_standings.groupby('conference')
        .cumcount()
        .add(1)
    )

    conf_standings = conf_standings.drop('conference', axis=1)

    net_ratings = net_ratings.merge(conf_standings, left_on="school", right_on="Team", how="left").drop("Team", axis=1).rename(columns={"rank" : "net_rank"})
    net_ratings = net_ratings.merge(national_sos_rankings, left_on="school", right_on="team", how="left").drop("team", axis=1)

    automatic_bids = net_ratings[net_ratings.conf_rank.eq(1)]
    automatic_bids.loc[:, "bid_type"] = "auto"

    at_large = net_ratings[net_ratings.conf_rank.ne(1)].sort_values('net_rank').head(37)
    at_large.loc[:, "bid_type"] = "at-large"

    field = pd.concat([automatic_bids, at_large], axis=0)

    ap_num = pd.to_numeric(field["ap_rank"], errors="coerce")

    # Binary bonus for being ranked at all
    ap_ranked_bonus = ap_num.notna().astype(int) * 4.0

    # Graded bonus for how high you are ranked
    ap_position_bonus = (
        (26 - ap_num)
        .clip(lower=0)
        .fillna(0)
        * 0.4
    )

    ap_component = ap_ranked_bonus + ap_position_bonus

    # -------------------------
    # QUALITY (NET-FIRST)
    # -------------------------
    # NET defines global ordering
    # AP nudges teams across seed lines

    quality = (
        -2.0 * field["net_rank"] +
        ap_component
    )
    # Max = + 10.5


    # -------------------------
    # RESUME (SCALED, REALISTIC)
    # -------------------------
    quad_score = (
        20 * field.quad1_w +
    -15 * field.quad1_l +
        12 * field.quad2_w +
        -8  * field.quad2_l +
        4  * field.quad3_w
    )

    location_score = (
        6 * field.road_w +
        4 * field.neutral_w +
        2 * field.home_w
    )

    resume = quad_score + location_score


    # -------------------------
    # BAD LOSSES (HARD CONSTRAINT)
    # -------------------------
    bad_losses = (
        30 * field.quad3_l +
        50 * field.quad4_l
    )

    record_penalty = (
        (0.750 - field["w_pct"])
        .clip(lower=0)
        * 100
    )

    penalties = bad_losses + record_penalty


    # -------------------------
    # FINAL SEED SCORE
    # -------------------------
    seed_score = (
        0.60 * quality +
        0.30 * resume -
        0.10 * penalties
    )

    field["seed_score"] = seed_score
    field = field.sort_values("seed_score", ascending=False)
    field["s_curve"] = np.arange(1, len(field) + 1)
    field["seed"] = (field["s_curve"] - 1) // 4 + 1

    lowest4_atlarge = field[field.bid_type.eq("at-large")].sort_values("s_curve", ascending=False).head(4)

    lowest4_auto = field[field.bid_type.eq("auto")].sort_values("s_curve", ascending=False).head(4)

    def move_best_up(field, from_seed, to_seed, bid_type, n):
        candidates = (
            field[(field["seed"] == from_seed) & (field["bid_type"] == bid_type)]
            .sort_values("s_curve")   # best teams first
            .head(n)
        )

        if len(candidates) < n:
            candidates = (
                field[(field["seed"] == from_seed)]
                .sort_values("s_curve")   # best teams first
                .head(n)
            )

        field.loc[candidates.index, "seed"] = to_seed

    def move_worst_down(field, from_seed, to_seed, bid_type, n):
        candidates = (
            field[(field["seed"] == from_seed) & (field["bid_type"] == bid_type)]
            .sort_values("s_curve", ascending=False)   # best teams first
            .head(n)
        )

        if len(candidates) < n:
            candidates = (
                field[(field["seed"] == from_seed)]
                .sort_values("s_curve", ascending=False)   # best teams first
                .head(n)
            )
            
        field.loc[candidates.index, "seed"] = to_seed

    move_best_up(field, 17, 16, 'auto', 4)
    move_best_up(field, 16, 15, 'auto', 2)
    move_best_up(field, 15, 14, 'auto', 2)
    move_best_up(field, 14, 13, 'auto', 2)
    move_best_up(field, 13, 12, 'auto', 2)
    move_best_up(field, 12, 10, 'auto', 2)
    move_worst_down(field, 10, 11, 'at-large', 2)

    lowest4_atlarge = field[field.bid_type.eq("at-large") & field.seed.eq(11)].sort_values("s_curve", ascending=False).head(4)
    lowest4_auto = field[field.bid_type.eq("auto")].sort_values("s_curve", ascending=False).head(4)

    field["first_four"] = (
        field.school.isin(lowest4_atlarge.school) |
        field.school.isin(lowest4_auto.school)
    )

    regions = np.array(["West", "East", "Midwest", "South"])

    def set_regions(field):
        region_sums = [0, 0, 0, 0]
        fld = field.copy()
        fld = fld.sort_values(["seed", "s_curve"])
        fld["region"] = None
        for seedno in range(1, 17):
            if seedno in [11, 16]:
                continue 
            difficulty_order = np.argsort(region_sums)[::-1]
            fld.loc[fld.seed.eq(seedno), "region"] = regions[difficulty_order]
            for region in regions:
                region_sums[np.where(regions == region)[0][0]] = fld[fld.region.eq(region)].s_curve.sum()
        for seedno in [11, 16]:
            region = fld[fld.seed.eq(17 - seedno)].sort_values('s_curve', ascending=False).head(2).region.tolist()
            fld.loc[fld.seed.eq(seedno) & fld.first_four.ne(True), "region"] = region
            remaining_regions = fld[fld.seed.eq(17 - seedno)].sort_values('s_curve', ascending=False).tail(2).region.tolist()
            fld.loc[fld.seed.eq(seedno) & fld.first_four.eq(True), "region"] = remaining_regions + remaining_regions[::-1]
        return fld

    field_w_regions = set_regions(field)
            
    def set_first_round_opponents(field):
        fld = field.copy()
        fld["first_rd_opp"] = None
        for region in regions:
            teams = fld[fld.region.eq(region) & fld.first_four.eq(True)].school.to_list()
            fld.loc[fld.region.eq(region) & fld.first_four.eq(True), 'first_rd_opp'] = teams[::-1]

            matchups = {1 : 16, 2 : 15, 3 : 14, 4 : 13, 5 : 12, 6 : 11, 7 : 10, 8 : 9, 9 : 8, 10 : 7, 11 : 6, 12 : 5, 13 : 4, 14 : 3, 15 : 2, 16 : 1}
            for seed, match in matchups.items():
                if seed in fld[fld.region.eq(region) & fld.first_four.eq(True)].seed.to_list():
                    continue
                elif match in fld[fld.region.eq(region) & fld.first_four.eq(True)].seed.to_list():
                    teams = fld[fld.region.eq(region) & fld.first_four.eq(True) & fld.seed.eq(match)].school.to_list()
                    fld.loc[fld.region.eq(region) & fld.first_four.eq(False) & fld.seed.eq(seed), 'first_rd_opp'] = f"{teams[0]}/{teams[1]}"
                else:
                    teams = fld[fld.region.eq(region) & fld.first_four.eq(False) & fld.seed.isin([seed, match])].school.to_list()
                    fld.loc[fld.region.eq(region) & fld.first_four.eq(False) & fld.seed.isin([seed, match]), 'first_rd_opp'] = teams[::-1]

        return fld

    final_field = set_first_round_opponents(field_w_regions)

    def generate_bracket_html(field, output_path="../public/bracket.html"):
        
        def get_matchup_html(region, seed):
            """Generate HTML for a single matchup (two teams)"""
            r = field[field["region"] == region]
            team = r[r["seed"] == seed]
            if team.empty:
                return '<div class="game"><div class="team"><span class="seed"></span><span class="name">TBD</span></div><div class="team"><span class="seed"></span><span class="name">TBD</span></div></div>'
            
            team = team.iloc[0]
            opp = team["first_rd_opp"]
            opp_seed = 17 - seed
            
            # Handle First Four matchups (e.g., "Team A/Team B")
            if "/" in str(opp):
                opp_display = opp
                opp_seed_display = f"{opp_seed}"
            elif opp and str(opp).strip():
                parts = str(opp).split()
                if parts and parts[0].isdigit():
                    opp_seed_display = parts[0]
                    opp_display = ' '.join(parts[1:])
                else:
                    opp_seed_display = str(opp_seed)
                    opp_display = str(opp)
            else:
                opp_display = "TBD"
                opp_seed_display = str(opp_seed)
            
            return f'''<div class="game">
                <div class="team"><span class="seed">{seed}</span><span class="name">{team.school}</span></div>
                <div class="team"><span class="seed">{opp_seed_display}</span><span class="name">{opp_display}</span></div>
            </div>'''

        def region_round1(region, seeds):
            games = [get_matchup_html(region, s) for s in seeds]
            return '\n'.join(games)

        def empty_game():
            return '''<div class="game">
                <div class="team"><span class="seed"></span><span class="name"></span></div>
                <div class="team"><span class="seed"></span><span class="name"></span></div>
            </div>'''

        def empty_games(n):
            return '\n'.join([empty_game() for _ in range(n)])

        def final_four_game():
            return '''<div class="game ff-game">
                <div class="team"><span class="seed"></span><span class="name"></span></div>
                <div class="team"><span class="seed"></span><span class="name"></span></div>
            </div>'''

        def championship_game():
            return '''<div class="game championship-game">
                <div class="team"><span class="seed"></span><span class="name"></span></div>
                <div class="team"><span class="seed"></span><span class="name"></span></div>
            </div>'''

        html = f'''<!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <title>NCAA Tournament Bracket</title>
    <style>
    * {{
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }}

    body {{
        font-family: 'Helvetica Neue', Arial, sans-serif;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        min-height: 100vh;
        padding: 20px;
        color: #fff;
    }}

    h1 {{
        text-align: center;
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #fff;
    }}

    .subtitle {{
        text-align: center;
        font-size: 14px;
        color: #888;
        margin-bottom: 25px;
    }}

    .back-button {{
        display: inline-block;
        position: absolute;
        top: 20px;
        left: 20px;
        padding: 10px 20px;
        background: #00205B;
        color: #FFFFFF;
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;
        border-radius: 6px;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0, 32, 91, 0.3);
    }}

    .back-button:hover {{
        background: #001740;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 32, 91, 0.4);
    }}

    .bracket-container {{
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0;
        max-width: 1800px;
        margin: 0 auto;
    }}

    .side {{
        display: flex;
        flex-direction: column;
        gap: 30px;
    }}

    .region {{
        display: flex;
        flex-direction: row;
        align-items: center;
    }}

    .region-label {{
        writing-mode: vertical-rl;
        text-orientation: mixed;
        font-weight: 700;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 3px;
        padding: 10px 5px;
        background: linear-gradient(180deg, #c41e3a, #8b0000);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
    }}

    .region.left .region-label {{
        transform: rotate(180deg);
    }}

    .round {{
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
    }}

    .round-header {{
        text-align: center;
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        color: #888;
        letter-spacing: 1px;
        position: absolute;
        top: -16px;
        left: 0;
        right: 0;
    }}

    .game {{
        background: #fff;
        border-radius: 4px;
        margin: 0 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        width: 130px;
        height: 44px;
        flex-shrink: 0;
    }}

    .team {{
        display: flex;
        align-items: center;
        padding: 4px 6px;
        border-bottom: 1px solid #e0e0e0;
        height: 22px;
        color: #333;
        background: #fff;
    }}

    .team:first-child {{
        border-radius: 4px 4px 0 0;
    }}

    .team:last-child {{
        border-bottom: none;
        border-radius: 0 0 4px 4px;
    }}

    .seed {{
        min-width: 18px;
        width: 18px;
        font-weight: 700;
        font-size: 11px;
        color: #c41e3a;
        text-align: center;
        flex-shrink: 0;
    }}

    .name {{
        flex: 1;
        font-size: 11px;
        font-weight: 500;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-left: 4px;
    }}

    /* R64: 8 games, base spacing */
    .r64 {{
        padding-top: 18px;
    }}
    .r64 .game {{
        margin-top: 3px;
        margin-bottom: 3px;
    }}

    /* R32: 4 games, each centered between 2 R64 games */
    /* R64 block = 44 + 6 = 50px, so 2 blocks = 100px */
    /* R32 needs (100 - 44)/2 = 28px margin each side */
    .r32 {{
        padding-top: 18px;
    }}
    .r32 .game {{
        margin-top: 28px;
        margin-bottom: 28px;
    }}

    /* S16: 2 games, each centered between 2 R32 games */
    /* R32 block = 44 + 56 = 100px, so 2 blocks = 200px */
    /* S16 needs (200 - 44)/2 = 78px margin each side */
    .s16 {{
        padding-top: 18px;
    }}
    .s16 .game {{
        margin-top: 78px;
        margin-bottom: 78px;
    }}

    /* E8: 1 game, centered between 2 S16 games */
    /* S16 block = 44 + 156 = 200px, so 2 blocks = 400px */
    /* E8 needs (400 - 44)/2 = 178px margin each side */
    .e8 {{
        padding-top: 18px;
    }}
    .e8 .game {{
        margin-top: 178px;
        margin-bottom: 178px;
    }}

    /* Final Four section */
    .final-four {{
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 0 20px;
        min-width: 180px;
    }}

    .ff-label {{
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 20px;
        color: #ffd700;
        text-align: center;
    }}

    .ff-matchups {{
        display: flex;
        flex-direction: column;
        gap: 50px;
        align-items: center;
    }}

    .ff-game {{
        width: 150px;
        height: 44px;
        background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
        border: 2px solid #ffd700;
        margin: 0;
    }}

    .ff-game .team {{
        background: transparent;
    }}

    .championship {{
        margin-top: 40px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
    }}

    .champ-label {{
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 10px;
        color: #ffd700;
    }}

    .championship-game {{
        width: 150px;
        height: 44px;
        background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
        border: 2px solid #ffd700;
        margin: 0;
    }}

    .championship-game .team {{
        background: transparent;
    }}

    .champion-box {{
        margin-top: 25px;
        padding: 15px 30px;
        background: linear-gradient(135deg, #c41e3a, #8b0000);
        border-radius: 6px;
        text-align: center;
    }}

    .champion-title {{
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #ffd700;
        margin-bottom: 6px;
    }}

    .champion-name {{
        font-size: 16px;
        font-weight: 700;
        color: #fff;
    }}

    @media (max-width: 1400px) {{
        .game {{
            width: 110px;
        }}
        .name {{
            font-size: 9px;
        }}
        .seed {{
            font-size: 9px;
            min-width: 14px;
            width: 14px;
        }}
    }}
    </style>
    </head>
    <body>

    <a href="index.html" class="back-button">← Back to Main</a>
    <h1>🏀 NCAA Tournament Bracket</h1>
    <p class="subtitle">March Madness 2025</p>

    <div class="bracket-container">
        <!-- LEFT SIDE -->
        <div class="side">
            <div class="region left">
                <div class="region-label">East</div>
                <div class="round r64">
                    <div class="round-header">1st Round</div>
                    {region_round1("East", [1, 8, 5, 4, 6, 3, 7, 2])}
                </div>
                <div class="round r32">
                    <div class="round-header">2nd Round</div>
                    {empty_games(4)}
                </div>
                <div class="round s16">
                    <div class="round-header">Sweet 16</div>
                    {empty_games(2)}
                </div>
                <div class="round e8">
                    <div class="round-header">Elite 8</div>
                    {empty_games(1)}
                </div>
            </div>
            
            <div class="region left">
                <div class="region-label">West</div>
                <div class="round r64">
                    <div class="round-header">1st Round</div>
                    {region_round1("West", [1, 8, 5, 4, 6, 3, 7, 2])}
                </div>
                <div class="round r32">
                    <div class="round-header">2nd Round</div>
                    {empty_games(4)}
                </div>
                <div class="round s16">
                    <div class="round-header">Sweet 16</div>
                    {empty_games(2)}
                </div>
                <div class="round e8">
                    <div class="round-header">Elite 8</div>
                    {empty_games(1)}
                </div>
            </div>
        </div>

        <!-- FINAL FOUR CENTER -->
        <div class="final-four">
            <div class="ff-label">Final Four</div>
            <div class="ff-matchups">
                {final_four_game()}
                {final_four_game()}
            </div>
            <div class="championship">
                <div class="champ-label">Championship</div>
                {championship_game()}
            </div>
            <div class="champion-box">
                <div class="champion-title">National Champion</div>
                <div class="champion-name">TBD</div>
            </div>
        </div>

        <!-- RIGHT SIDE -->
        <div class="side">
            <div class="region right">
                <div class="round e8">
                    <div class="round-header">Elite 8</div>
                    {empty_games(1)}
                </div>
                <div class="round s16">
                    <div class="round-header">Sweet 16</div>
                    {empty_games(2)}
                </div>
                <div class="round r32">
                    <div class="round-header">2nd Round</div>
                    {empty_games(4)}
                </div>
                <div class="round r64">
                    <div class="round-header">1st Round</div>
                    {region_round1("South", [1, 8, 5, 4, 6, 3, 7, 2])}
                </div>
                <div class="region-label">South</div>
            </div>
            
            <div class="region right">
                <div class="round e8">
                    <div class="round-header">Elite 8</div>
                    {empty_games(1)}
                </div>
                <div class="round s16">
                    <div class="round-header">Sweet 16</div>
                    {empty_games(2)}
                </div>
                <div class="round r32">
                    <div class="round-header">2nd Round</div>
                    {empty_games(4)}
                </div>
                <div class="round r64">
                    <div class="round-header">1st Round</div>
                    {region_round1("Midwest", [1, 8, 5, 4, 6, 3, 7, 2])}
                </div>
                <div class="region-label">Midwest</div>
            </div>
        </div>
    </div>

    </body>
    </html>'''

        Path(output_path).write_text(html)
        print(f"Bracket saved to {output_path}")
        return output_path

    generate_bracket_html(final_field)

def build_pregame_features(history_df: pd.DataFrame, team: str, opponent: str, game_date, location: str):
    # --------------------------------------------------
    # Normalize date
    # --------------------------------------------------
    if not isinstance(game_date, pd.Timestamp):
        game_date = pd.to_datetime(game_date)

    # --------------------------------------------------
    # Filter to games BEFORE this matchup (no leakage)
    # --------------------------------------------------
    df = history_df[history_df["date"] < game_date].copy()
    df = df.sort_values("date")

    # --------------------------------------------------
    # Helper to compute rolling stats safely
    # --------------------------------------------------
    def last_n_mean(series, n):
        return series.tail(n).mean() if len(series) >= n else series.mean()

    # --------------------------------------------------
    # TEAM FEATURES
    # --------------------------------------------------
    team_games = df[df["team"] == team].sort_values("date")

    team_poss_pre = team_games["team_poss"].mean()
    team_poss_l3 = last_n_mean(team_games["team_poss"], 3)
    team_poss_l5 = last_n_mean(team_games["team_poss"], 5)

    team_ortg_pre = team_games["team_ortg"].mean()
    team_ortg_l3 = last_n_mean(team_games["team_ortg"], 3)
    team_ortg_l5 = last_n_mean(team_games["team_ortg"], 5)

    team_net_rank = team_games["team_net_rank"].iloc[-1]
    team_conference = team_games["team_conference"].iloc[-1]

    # --------------------------------------------------
    # OPPONENT FEATURES
    # --------------------------------------------------
    opp_games = df[df["team"] == opponent].sort_values("date")

    opp_poss_pre = opp_games["team_poss"].mean()
    opp_poss_l3 = last_n_mean(opp_games["team_poss"], 3)
    opp_poss_l5 = last_n_mean(opp_games["team_poss"], 5)

    opp_drtg_pre = opp_games["team_drtg"].mean()
    opp_drtg_l3 = last_n_mean(opp_games["team_drtg"], 3)
    opp_drtg_l5 = last_n_mean(opp_games["team_drtg"], 5)

    opp_net_rank = opp_games["team_net_rank"].iloc[-1]
    opp_conference = opp_games["team_conference"].iloc[-1]

    # --------------------------------------------------
    # CONFERENCE AVERAGE FEATURES (PREGAME, SAFE)
    # --------------------------------------------------
    team_conf_avg_pts_pre = (
        df[df["team_conference"] == team_conference]["team_pts"].mean()
    )

    opp_conf_avg_pts_pre = (
        df[df["team_conference"] == opp_conference]["team_pts"].mean()
    )

    # --------------------------------------------------
    # Assemble feature row
    # --------------------------------------------------
    features = pd.DataFrame([{
        "team_net_rank": team_net_rank,
        "opponent_net_rank": opp_net_rank,
        "diff_net_rank": team_net_rank - opp_net_rank,

        "team_poss_pre_game": team_poss_pre,
        "team_poss_last_3": team_poss_l3,
        "team_poss_last_5": team_poss_l5,

        "opponent_poss_pre_game": opp_poss_pre,
        "opponent_poss_last_3": opp_poss_l3,
        "opponent_poss_last_5": opp_poss_l5,

        "team_ortg_pre_game": team_ortg_pre,
        "team_ortg_last_3": team_ortg_l3,
        "team_ortg_last_5": team_ortg_l5,

        "opponent_drtg_pre_game": opp_drtg_pre,
        "opponent_drtg_last_3": opp_drtg_l3,
        "opponent_drtg_last_5": opp_drtg_l5,

        "team_conf_avg_pts_pre_game": team_conf_avg_pts_pre,
        "opp_conf_avg_pts_pre_game": opp_conf_avg_pts_pre,

        "location": 1 if location == "home" else 0
    }])

    return features

def predict_team_points(history_df, team: str, opponent: str, game_date, location: str):
    """
    Returns calibrated q25 / q50 / q75 point predictions for a team.
    """

    # -----------------------------------------
    # Build features
    # -----------------------------------------
    X_new = build_pregame_features(
        history_df=history_df,
        team=team,
        opponent=opponent,
        game_date=game_date,
        location=location
    )

    # Ensure column order matches training
    X_new = X_new[EXPECTED_COLS]

    # -----------------------------------------
    # Predict (log space)
    # -----------------------------------------
    q5_log = MODEL_Q5.predict(X_new)
    q10_log = MODEL_Q10.predict(X_new)
    q25_log = MODEL_Q25.predict(X_new)
    q50_log = MODEL_Q50.predict(X_new)
    q75_log = MODEL_Q75.predict(X_new)
    q90_log = MODEL_Q90.predict(X_new)
    q95_log = MODEL_Q95.predict(X_new)

    # Back-transform
    q5 = np.expm1(q5_log)
    q10 = np.expm1(q10_log)
    q25 = np.expm1(q25_log)
    q50 = np.expm1(q50_log)
    q75 = np.expm1(q75_log)
    q90 = np.expm1(q90_log)
    q95 = np.expm1(q95_log)

    # -----------------------------------------
    # Conformal calibration
    # -----------------------------------------
    q25_adj = q25 - CONFORMAL_DELTA_50
    q75_adj = q75 + CONFORMAL_DELTA_50

    q25_adj = np.minimum(q25_adj, q50)
    q75_adj = np.maximum(q75_adj, q50)

    q10_adj = q10 - CONFORMAL_DELTA_80
    q90_adj = q90 + CONFORMAL_DELTA_80

    q10_adj = np.minimum(q10_adj, q25_adj)
    q90_adj = np.maximum(q90_adj, q75_adj)

    q5_adj = q5 - CONFORMAL_DELTA_90
    q95_adj = q95 + CONFORMAL_DELTA_90

    q5_adj = np.minimum(q5_adj, q10_adj)
    q95_adj = np.maximum(q95_adj, q90_adj)

    # -----------------------------------------
    # Return clean response
    # -----------------------------------------
    return {
        "team": team,
        "opponent": opponent,
        "median_pts": float(q50[0]),
        "q5": float(q5_adj[0]),
        "q10": float(q10_adj[0]),
        "q25": float(q25_adj[0]),
        "q75": float(q75_adj[0]),
        "q90": float(q90_adj[0]),
        "q95": float(q95_adj[0]),
        "range_50": [
            float(q25_adj[0]),
            float(q75_adj[0])
        ],
        "range_80": [
            float(q10_adj[0]),
            float(q90_adj[0])
        ],
        "range_90": [
            float(q5_adj[0]),
            float(q95_adj[0])
        ]
    }

def get_team_pts_prediction(team, opponent, gamedate, location):
    matchups_df["date"] = pd.to_datetime(matchups_df["date"])

    net_ratings = NET_ratings.rename(columns={
            "Rank" : "net_rank",
            "School" : "school",
            "Conference" : "conference",
            "Previous" : "previous",
            "Quad 1 W" : "quad1_w",
            "Quad 1 L" : "quad1_l",
            "Quad 2 W" : "quad2_w",
            "Quad 2 L" : "quad2_l",
            "Quad 3 W" : "quad3_w",
            "Quad 3 L" : "quad3_l",
            "Quad 4 W" : "quad4_w",
            "Quad 4 L" : "quad4_l",
            "W" : "w", 
            "L" : "l",
            "Road W" : "road_w",
            "Road L" : "road_l",
            "Home W" : "home_w",
            "Home L" : "home_l",
            "Neutral W" : "neutral_w",
            "Neutral L" : "neutral_l",
            "Non-Div I W" : "non_div1_w",
            "Non-Div I L" : "non_div1_l"
        })

    net_ratings['school'] = net_ratings['school'].str.replace(' St.', ' State')
    net_ratings['school'] = net_ratings['school'].str.replace(' Ky.', ' Kentucky')
    net_ratings['school'] = net_ratings['school'].str.replace('Ga.', 'Georgia')
    net_ratings['school'] = net_ratings['school'].str.replace('Fla.', 'Florida')
    net_ratings['school'] = net_ratings['school'].str.replace('Mich.', 'Michigan')
        
    name_mapping = {
        "North Carolina" : "UNC",
        "Southern California" : "USC",
        "McNeese" : "McNeese State",
        "Seattle U" : "Seattle",
        "UNI" : "Northern Iowa",
        "Pittsburgh" : "Pitt",
        "Middle Tenn." : "Middle Tennessee",
        "Saint Mary's (CA)" : "Saint Mary's",
        "UC San Diego" : "UC-San Diego",
        "SFA" : "Stephen F. Austin",
        "LMU (CA)" : "Loyola Marymount",
        "UNCW" : "UNC Wilmington",
        "UC Irvine" : "UC-Irvine",
        "UC Davis" : "UC-Davis",
        "St. Thomas (MN)" : "St. Thomas",
        "Southern Ill." : "Southern Illinois",
        "Northern Colo." : "Northern Colorado",
        "UC Santa Barbara" : "UCSB",
        "Southern Miss." : "Southern Miss",
        "UT Martin" : "UT-Martin",
        "Col. of Charleston" : "College of Charleston",
        "Massachusetts" : "UMass",
        "FIU" : "Florida International",
        "UTRGV" : "Texas-Rio Grande Valley",
        "UIW" : "Incarnate Word",
        "Charleston So." : "Charleston Southern",
        "Nicholls" : "Nicholls State",
        "A&M-Corpus Christi" : "Texas A&M-Corpus Christi",
        "FGCU" : "Florida Gulf Coast",
        "Southeast Mo. State" : "Southeast Missouri State",
        "CSUN" : "Cal State Northridge",
        "Central Ark." : "Central Arkansas",
        "App State" : "Appalachian State",
        "Central Conn. State" : "Central Connecticut",
        "Lamar University" : "Lamar",
        "Saint Joseph's" : "St. Joseph's",
        "UC Riverside" : "UC-Riverside",
        "SIUE" : "SIU-Edwardsville",
        "Northern Ariz." : "Northern Arizona",
        "Boston U." : "Boston University",
        "Eastern Wash." : "Eastern Washington",
        "N.C. A&T" : "North Carolina A&T",
        "Saint Peter's" : "St. Peter's",
        "Western Caro." : "Western Carolina",
        "Southeastern La." : "Southeastern Louisiana",
        "Army West Point" : "Army",
        "Southern U." : "Southern",
        "Ark.-Pine Bluff" : "Arkansas-Pine Bluff",
        "North Ala." : "North Alabama",
        "CSU Bakersfield" : "Cal State Bakersfield",
        "Eastern Ill." : "Eastern Illinois",
        "Loyola Chicago" : "Loyola (IL)",
        "Alcorn" : "Alcorn State",
        "Mount State Mary's" : "Mount St. Mary's",
        "NIU" : "Northern Illinois",
        "UAlbany" : "Albany (NY)",
        "UMass Lowell" : "UMass-Lowell",
        "IU Indy" : "IU Indianapolis",
        "UMES" : "Maryland-Eastern Shore",
        "Southern Ind." : "Southern Indiana",
        "Western Ill." : "Western Illinois",
        "Loyola Maryland" : "Loyola (MD)",
        "N.C. Central" : "North Carolina Central",
        "ULM" : "Louisiana-Monroe",
        "Saint Francis" : "Saint Francis (PA)",
        "Mississippi Val." : "Mississippi Valley State"
    }

    net_ratings['school'] = net_ratings['school'].replace(name_mapping)

    drop_cols = [
        "gameid", "team_games_before", 
        "opponent_games_before"
    ]

    df = matchups_df.drop(columns=drop_cols)

    df = df.merge(
        net_ratings[["school", "net_rank"]],
        left_on="team",
        right_on="school",
        how="left"
    )

    df = df[~df.school.isna()].drop(columns=["school"]).rename(columns={"net_rank" : "team_net_rank"})

    df = df.merge(
        net_ratings[["school", "net_rank"]],
        left_on="opponent", 
        right_on="school",
        how="left"
    )

    df = df[~df.school.isna()].drop(columns=["school"]).rename(columns={"net_rank" : "opponent_net_rank"})

    team_pred = predict_team_points(df, team, opponent, gamedate, location)
    opponent_pred = predict_team_points(df, opponent, team, gamedate, ("home" if location == "away" else "away"))

    return team_pred, opponent_pred

def get_or_create_prediction(team, opponent, gamedate, location):
    # NEW cursor per call (CRITICAL)
    cur = conn.cursor()

    try:
        # ----------------------------
        # Normalize date
        # ----------------------------
        gamedate = pd.to_datetime(gamedate).date()

        # ----------------------------
        # Check cache
        # ----------------------------
        cur.execute(
            """
            SELECT prediction_json
            FROM game_point_predictions
            WHERE team = %s
              AND opponent = %s
              AND gamedate = %s
            """,
            (team, opponent, gamedate)
        )

        row = cur.fetchone()

        if row is not None:
            return json.loads(row[0])

        # ----------------------------
        # Compute prediction
        # ----------------------------
        team_proj, opponent_proj = get_team_pts_prediction(
            team, opponent, gamedate, location
        )

        result = {
            team: team_proj,
            opponent: opponent_proj
        }

        # ----------------------------
        # Insert
        # ----------------------------
        cur.execute(
            """
            INSERT INTO game_point_predictions
            (team, opponent, gamedate, location, prediction_json)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                team,
                opponent,
                gamedate,
                location,
                json.dumps(result)
            )
        )

        conn.commit()
        return result

    except Exception:
        conn.rollback()
        raise

    finally:
        cur.close()

def get_or_create_metrics(team, opponent, gamedate, n_samples=20000, sims=200, blowout_margin=15.0):
    # NEW cursor per call (CRITICAL)
    cur = conn.cursor()

    try:
        # ----------------------------
        # Normalize date
        # ----------------------------
        gamedate = pd.to_datetime(gamedate).date()

        # ----------------------------
        # Check cache
        # ----------------------------
        cur.execute(
            """
            SELECT metrics_json
            FROM game_distribution_metrics
            WHERE team = %s
              AND opponent = %s
              AND gamedate = %s
              AND n_samples = %s
              AND sims = %s
              AND blowout_margin = %s
            """,
            (team, opponent, gamedate, n_samples, sims, blowout_margin)
        )

        row = cur.fetchone()

        if row is not None:
            return json.loads(row[0])

        # ----------------------------
        # Need to compute - first get prediction
        # ----------------------------
        # We need the game_result (prediction) to compute metrics
        # This will be passed from the endpoint
        return None  # Signal that we need to compute

    except Exception:
        conn.rollback()
        raise

    finally:
        cur.close()

def store_metrics(team, opponent, gamedate, metrics, n_samples=20000, sims=200, blowout_margin=15.0):
    # NEW cursor per call (CRITICAL)
    cur = conn.cursor()

    try:
        # ----------------------------
        # Normalize date
        # ----------------------------
        gamedate = pd.to_datetime(gamedate).date()

        # ----------------------------
        # Insert
        # ----------------------------
        cur.execute(
            """
            INSERT INTO game_distribution_metrics
            (team, opponent, gamedate, n_samples, sims, blowout_margin, metrics_json)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (team, opponent, gamedate, n_samples, sims, blowout_margin)
            DO UPDATE SET metrics_json = EXCLUDED.metrics_json
            """,
            (
                team,
                opponent,
                gamedate,
                n_samples,
                sims,
                blowout_margin,
                json.dumps(metrics)
            )
        )

        conn.commit()

    except Exception:
        conn.rollback()
        raise

    finally:
        cur.close()

def matchup_distribution_metrics(game_result, n_samples=20000, sims=200, blowout_margin=15.0):

    # -----------------------------
    # Helpers
    # -----------------------------
    def sample_points(team_dict, n):
        qs = np.array([0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95])
        pts = np.array([
            team_dict["q5"],
            team_dict["q10"],
            team_dict["q25"],
            team_dict["median_pts"],
            team_dict["q75"],
            team_dict["q90"],
            team_dict["q95"],
        ])

        inv_cdf = interp1d(
            qs,
            pts,
            bounds_error=False,
            fill_value=(pts[0], pts[-1])
        )

        u = np.random.uniform(qs.min(), qs.max(), size=n)
        return inv_cdf(u)

    # -----------------------------
    # Identify teams
    # -----------------------------
    teams = list(game_result.keys())
    team_a, team_b = teams[0], teams[1]

    med_a = game_result[team_a]["median_pts"]
    med_b = game_result[team_b]["median_pts"]

    favorite = team_a if med_a > med_b else team_b
    underdog = team_b if favorite == team_a else team_a

    # -----------------------------
    # Monte Carlo
    # -----------------------------
    win_probs = []
    spreads = []
    upset_probs = []
    blowout_probs = []

    for _ in range(sims):
        A = sample_points(game_result[team_a], n_samples // sims)
        B = sample_points(game_result[team_b], n_samples // sims)

        margin = A - B

        win_prob_a = np.mean(margin > 0)
        win_probs.append(win_prob_a)

        spreads.append(np.median(margin))

        # Upset: underdog wins
        if favorite == team_a:
            upset_probs.append(np.mean(B > A))
            blowout_probs.append(np.mean(margin >= blowout_margin))
        else:
            upset_probs.append(np.mean(A > B))
            blowout_probs.append(np.mean(-margin >= blowout_margin))

    # -----------------------------
    # Aggregate distributions
    # -----------------------------
    def dist_stats(x):
        return {
            "p5":  float(np.percentile(x, 5)),
            "p10": float(np.percentile(x, 10)),
            "p25": float(np.percentile(x, 25)),
            "p50": float(np.percentile(x, 50)),
            "p75": float(np.percentile(x, 75)),
            "p90": float(np.percentile(x, 90)),
            "p95": float(np.percentile(x, 95)),
        }

    return {
        "favorite": favorite,
        "underdog": underdog,

        "win_probability": {
            team_a: dist_stats(win_probs),
            team_b: {
                k: 1 - v for k, v in dist_stats(win_probs).items()
            }
        },

        "spread_estimate": {
            "median": float(np.median(spreads)),
            "distribution": dist_stats(spreads)
        },

        "upset_risk": {
            "median": float(np.median(upset_probs)),
            "distribution": dist_stats(upset_probs)
        },

        "blowout_probability": {
            "margin": blowout_margin,
            "median": float(np.median(blowout_probs)),
            "distribution": dist_stats(blowout_probs)
        }
    }

TEAM_RATINGS_FILE = "./data/team_ratings.pkl"
NET_RATINGS_FILE = "./data/NET_ratings.csv"

MAX_AGE_SECONDS = 24 * 60 * 60  # 1 day

def is_stale(path, max_age_seconds):
    if not os.path.exists(path):
        return True
    file_age = time.time() - os.path.getmtime(path)
    return file_age > max_age_seconds

if is_stale(TEAM_RATINGS_FILE, MAX_AGE_SECONDS):
    print("Recomputing team ratings...")
    ratings = compute_all_team_ratings()
    with open(TEAM_RATINGS_FILE, "wb") as f:
        pickle.dump(ratings, f)
else:
    print("Loading cached team ratings...")

if is_stale(NET_RATINGS_FILE, MAX_AGE_SECONDS):
    print("Recomputing NET ratings...")
    get_NET_ratings()
else:
    print("Using cached NET ratings...")

with open(TEAM_RATINGS_FILE, "rb") as f:
    team_ratings = pickle.load(f)

NET_ratings = pd.read_csv(NET_RATINGS_FILE)

app = Flask(__name__)
CORS(app)

@app.route("/players/all_player_names", methods=["GET"])
def all_players():
    d1_teams = conferences_df[conferences_df.conference != "Not D1"]["team"].unique()
    players = list(players_box_df[players_box_df.team.isin(d1_teams)].drop_duplicates(["player", "team"]).apply(lambda x: f"{x['player']}|{x['team']}", axis=1))
    return jsonify({"players" : players})

@app.route("/players/team_players", methods=["GET"])
def team_players():
    team = request.args.get("team")
    players = list(players_box_df[players_box_df.conference.ne("Not D1") & players_box_df.team.eq(team)]["player"].unique())
    return jsonify({"players" : players})

@app.route("/teams/all_team_names", methods=["GET"])
def all_teams():
    teams = list(matchups_df[matchups_df.team_conference != "Not D1"]["team"].unique())
    return jsonify({"teams" : teams})

@app.route("/conferences/all_conference_names", methods=["GET"])
def all_conferences():
    conferences = list(conferences_df["conference"].unique())
    return jsonify({"conferences" : conferences})

@app.route("/teams/all_team_conferences", methods=["GET"])
def team_conferences():
    conferences = {}
    for _, row in conferences_df.iterrows():
        conferences[row["team"]] = row["conference"]
    
    return jsonify(conferences)

@app.route("/teams/team_image", methods=["GET"])
def team_image():
    team = request.args.get("team")
    image = logo_images_df[logo_images_df.team.eq(team)].iloc[0]["logo_url"]
    return jsonify({"image" : image})

@app.route("/teams/past_team_games", methods=["GET"])
def team_prev_games():
    team = request.args.get("team")
    team_games = (
        matchups_df[matchups_df["team"] == team]
        .sort_values("date")[["date", "team", "team_rank", "team_pts", "location", "opponent", "opponent_rank", "opponent_pts"]]
    )

    team_games = team_games.replace(np.nan, None)

    return jsonify(team_games.to_dict(orient="records"))

@app.route("/pg_stats/player_pg_stats", methods=["GET"])
def player_pg_stats():
    player = request.args.get("player")
    team = request.args.get("team")
    
    cols = ["player", "team", "conference", "gp", "gs", "mp", "pts", "ast", "orb", "drb", "trb",
            "stl", "blk", "tov", "pf", "fgm", "fga", "fg_pct", "fg2m", "fg2a", "fg2_pct", "fg3m", "fg3a", "fg3_pct", "ftm", "fta",
            "ft_pct", "gmsc"]

    pg_stats = get_player_pg_stats(player, team)[cols] if team else get_player_pg_stats(player)[cols]
    
    record = pg_stats.replace({np.nan: None}).iloc[0]

    # Convert to list of pairs to preserve order in JS
    ordered_list = [[col, round(float(record[col]), 3)] if col not in ["player", "team", "conference"] and record[col] is not None else [col, record[col]] for col in cols]

    return jsonify(ordered_list)

@app.route("/pg_stats/players_pg_stats", methods=["GET"])
def players_pg_stats():
    players = request.args.getlist("players")
    pg_stats = get_players_pg_stats(players)
    return jsonify(pg_stats.to_dict(orient="records"))

@app.route("/pg_stats/conference_player_pg_leaders", methods=["GET"])
def conference_player_pg_stats_leader():
    conference = request.args.get("conference")
    stat = request.args.get("stat")
    n = request.args.get("n")

    params = ((conference, stat, n) if n else (conference, stat))
    leaders = get_conference_player_pg_stat_leaders(*params)
    return jsonify(leaders.to_dict(orient="records"))

@app.route("/pg_stats/national_player_pg_leaders", methods=["GET"])
def national_player_pg_stats_leader():
    stat = request.args.get("stat")
    n = request.args.get("n")

    if n:
        leaders = get_national_player_pg_stat_leaders(stat, int(n))
    else:
        leaders = get_national_player_pg_stat_leaders(stat)
    return jsonify(leaders.replace({np.nan: None}).to_dict(orient="records"))

@app.route("/pg_stats/team_pg_stats", methods=["GET"])
def team_pg_stats():
    team = request.args.get("team")

    cols = ["team", "team_conference", "gp", "W", "L", "team_pts", "team_ast", "team_orb", "team_drb", "team_trb",
            "team_stl", "team_blk", "team_tov", "team_pf", "team_fg2m", "team_fg2a", "team_fg2_pct", "team_fg3m", "team_fg3a", "team_fg3_pct", "team_ftm", "team_fta",
            "team_ft_pct", "pts_allowed", "ast_allowed", "orb_allowed", "drb_allowed", "trb_allowed",
            "stl_allowed", "shots_blocked", "forced_tov", "pf_drawn", "fg2m_allowed", "fg2a_allowed",
            "fg2_pct_allowed", "fg3m_allowed", "fg3a_allowed", "fg3_pct_allowed", "ftm_allowed", "fta_allowed",
            "ft_pct_allowed"]
    
    pg_stats = get_team_pg_stats(team)[cols]

    record = pg_stats.replace({np.nan: None}).iloc[0]

    ordered_list = [[col, round(float(record[col]), 3)] if col not in ["team", "team_conference"] and record[col] is not None else [col, record[col]] for col in cols]

    return jsonify(ordered_list)

@app.route("/pg_stats/teams_pg_stats", methods=["GET"])
def teams_pg_stats():
    teams = request.args.getlist("teams")
    pg_stats = get_teams_pg_stats(teams)
    return jsonify(pg_stats.to_dict(orient="records"))

@app.route("/rankings/top_25", methods=["GET"])
def top_25():
    rankings = get_top_25()
    return jsonify(rankings.replace({np.nan: None}).to_dict(orient="records"))

@app.route("/rankings/tournament_field", methods=["GET"])
def tournament_field():
    """Get the 68 teams in the tournament field (31 auto bids + 37 at-large)"""
    conference = request.args.get("conference")
    
    net_ratings = NET_ratings.rename(columns={
        "Rank" : "rank",
        "School" : "school",
        "Conference" : "conference",
        "Previous" : "previous",
        "Quad 1 W" : "quad1_w",
        "Quad 1 L" : "quad1_l",
        "Quad 2 W" : "quad2_w",
        "Quad 2 L" : "quad2_l",
        "Quad 3 W" : "quad3_w",
        "Quad 3 L" : "quad3_l",
        "Quad 4 W" : "quad4_w",
        "Quad 4 L" : "quad4_l",
        "W" : "w", 
        "L" : "l",
        "Road W" : "road_w",
        "Road L" : "road_l",
        "Home W" : "home_w",
        "Home L" : "home_l",
        "Neutral W" : "neutral_w",
        "Neutral L" : "neutral_l",
        "Non-Div I W" : "non_div1_w",
        "Non-Div I L" : "non_div1_l"
    })

    conferences = net_ratings.conference.unique()
    conferences = [i for i in conferences if i not in ['SoCon', 'Summit League', 'Patriot']]

    conferences.append('Southern')
    conferences.append('Summit')
    conferences.append('Patriot League')

    net_ratings["w_pct"] = net_ratings["w"] / (net_ratings["w"] + net_ratings["l"])

    conf_standings = pd.DataFrame()
    for conf in conferences:
        this_conf = get_conference_standings(conf)
        this_conf['conference'] = conf
        conf_standings = pd.concat([conf_standings, this_conf], axis=0)

    net_ratings['school'] = net_ratings['school'].str.replace(' St.', ' State')
    net_ratings['school'] = net_ratings['school'].str.replace(' Ky.', ' Kentucky')
    net_ratings['school'] = net_ratings['school'].str.replace('Ga.', 'Georgia')
    net_ratings['school'] = net_ratings['school'].str.replace('Fla.', 'Florida')
    net_ratings['school'] = net_ratings['school'].str.replace('Mich.', 'Michigan')

    name_mapping = {
        "North Carolina" : "UNC",
        "Southern California" : "USC",
        "McNeese" : "McNeese State",
        "Seattle U" : "Seattle",
        "UNI" : "Northern Iowa",
        "Pittsburgh" : "Pitt",
        "McNeese" : "McNeese State",
        "Middle Tenn." : "Middle Tennessee",
        "Saint Mary's (CA)" : "Saint Mary's",
        "UC San Diego" : "UC-San Diego",
        "SFA" : "Stephen F. Austin",
        "LMU (CA)" : "Loyola Marymount",
        "UNCW" : "UNC Wilmington",
        "UC Irvine" : "UC-Irvine",
        "UC Davis" : "UC-Davis",
        "St. Thomas (MN)" : "St. Thomas",
        "Southern Ill." : "Southern Illinois",
        "Northern Colo." : "Northern Colorado",
        "UC Santa Barbara" : "UCSB",
        "Southern Miss." : "Southern Miss",
        "UT Martin" : "UT-Martin",
        "Col. of Charleston" : "College of Charleston",
        "Massachusetts" : "UMass",
        "FIU" : "Florida International",
        "UTRGV" : "Texas-Rio Grande Valley",
        "UIW" : "Incarnate Word",
        "Charleston So." : "Charleston Southern",
        "Nicholls" : "Nicholls State",
        "A&M-Corpus Christi" : "Texas A&M-Corpus Christi",
        "FGCU" : "Florida Gulf Coast",
        "Southeast Mo. State" : "Southeast Missouri State",
        "CSUN" : "Cal State Northridge",
        "Central Ark." : "Central Arkansas",
        "App State" : "Appalachian State",
        "Central Conn. State" : "Central Connecticut",
        "Lamar University" : "Lamar",
        "Saint Joseph's" : "St. Joseph's",
        "UC Riverside" : "UC-Riverside",
        "SIUE" : "SIU-Edwardsville",
        "Northern Ariz." : "Northern Arizona",
        "Boston U." : "Boston University",
        "Eastern Wash." : "Eastern Washington",
        "N.C. A&T" : "North Carolina A&T",
        "Saint Peter's" : "St. Peter's",
        "Western Caro." : "Western Carolina",
        "Southeastern La." : "Southeastern Louisiana",
        "Army West Point" : "Army",
        "Southern U." : "Southern",
        "Ark.-Pine Bluff" : "Arkansas-Pine Bluff",
        "North Ala." : "North Alabama",
        "CSU Bakersfield" : "Cal State Bakersfield",
        "Eastern Ill." : "Eastern Illinois",
        "Loyola Chicago" : "Loyola (IL)",
        "Alcorn" : "Alcorn State",
        "Mount State Mary's" : "Mount St. Mary's",
        "NIU" : "Northern Illinois",
        "UAlbany" : "Albany (NY)",
        "UMass Lowell" : "UMass-Lowell",
        "IU Indy" : "IU Indianapolis",
        "UMES" : "Maryland-Eastern Shore",
        "Southern Ind." : "Southern Indiana",
        "Western Ill." : "Western Illinois",
        "Loyola Maryland" : "Loyola (MD)",
        "N.C. Central" : "North Carolina Central",
        "ULM" : "Louisiana-Monroe",
        "Saint Francis" : "Saint Francis (PA)",
        "Mississippi Val." : "Mississippi Valley State"
    }

    net_ratings['school'] = net_ratings['school'].replace(name_mapping)

    conf_standings = conf_standings.rename(columns={'rank' : 'ap_rank'})

    conf_standings = conf_standings.drop(["wins", "losses", "overall_win_pct"], axis=1)

    conf_standings['conf_rank'] = (
        conf_standings.groupby('conference')
        .cumcount()
        .add(1)
    )

    conf_standings = conf_standings.drop('conference', axis=1)

    net_ratings = net_ratings.merge(conf_standings, left_on="school", right_on="Team", how="left").drop("Team", axis=1).rename(columns={"rank" : "net_rank"})

    automatic_bids = net_ratings[net_ratings.conf_rank.eq(1)]
    automatic_bids.loc[:, "bid_type"] = "auto"

    at_large = net_ratings[net_ratings.conf_rank.ne(1)].sort_values('net_rank').head(37)
    at_large.loc[:, "bid_type"] = "at-large"

    field = pd.concat([automatic_bids, at_large], axis=0)
    
    field = field.sort_values("net_rank")

    # Filter by conference if specified
    if conference:
        field = field[field["conference"] == conference]
    
    # Select and rename columns for output
    output = field[[
        "net_rank", "school", "conference", "w", "l",
        "quad1_w", "quad1_l", "quad2_w", "quad2_l",
        "quad3_w", "quad3_l", "quad4_w", "quad4_l",
        "bid_type"
    ]].rename(columns={
        "net_rank": "rank",
        "school": "team",
        "conference": "conference",
        "w": "wins",
        "l": "losses",
        "quad1_w": "q1_wins",
        "quad1_l": "q1_losses",
        "quad2_w": "q2_wins",
        "quad2_l": "q2_losses",
        "quad3_w": "q3_wins",
        "quad3_l": "q3_losses",
        "quad4_w": "q4_wins",
        "quad4_l": "q4_losses"
    })
    
    return jsonify(output.replace({np.nan: None}).to_dict(orient="records"))

@app.route("/rankings/net_rankings", methods=["GET"])
def net_rankings():
    conference = request.args.get("conference")
    
    net_ratings = NET_ratings.rename(columns={
        "Rank" : "rank",
        "School" : "school",
        "Conference" : "conference",
        "Previous" : "previous",
        "Quad 1 W" : "quad1_w",
        "Quad 1 L" : "quad1_l",
        "Quad 2 W" : "quad2_w",
        "Quad 2 L" : "quad2_l",
        "Quad 3 W" : "quad3_w",
        "Quad 3 L" : "quad3_l",
        "Quad 4 W" : "quad4_w",
        "Quad 4 L" : "quad4_l",
        "W" : "w", 
        "L" : "l",
        "Road W" : "road_w",
        "Road L" : "road_l",
        "Home W" : "home_w",
        "Home L" : "home_l",
        "Neutral W" : "neutral_w",
        "Neutral L" : "neutral_l",
        "Non-Div I W" : "non_div1_w",
        "Non-Div I L" : "non_div1_l"
    })

    conferences = net_ratings.conference.unique()
    conferences = [i for i in conferences if i not in ['SoCon', 'Summit League', 'Patriot']]

    conferences.append('Southern')
    conferences.append('Summit')
    conferences.append('Patriot League')

    net_ratings["w_pct"] = net_ratings["w"] / (net_ratings["w"] + net_ratings["l"])

    conf_standings = pd.DataFrame()
    for conf in conferences:
        this_conf = get_conference_standings(conf)
        this_conf['conference'] = conf
        conf_standings = pd.concat([conf_standings, this_conf], axis=0)

    net_ratings['school'] = net_ratings['school'].str.replace(' St.', ' State')
    net_ratings['school'] = net_ratings['school'].str.replace(' Ky.', ' Kentucky')
    net_ratings['school'] = net_ratings['school'].str.replace('Ga.', 'Georgia')
    net_ratings['school'] = net_ratings['school'].str.replace('Fla.', 'Florida')
    net_ratings['school'] = net_ratings['school'].str.replace('Mich.', 'Michigan')

    name_mapping = {
        "North Carolina" : "UNC",
        "Southern California" : "USC",
        "McNeese" : "McNeese State",
        "Seattle U" : "Seattle",
        "UNI" : "Northern Iowa",
        "Pittsburgh" : "Pitt",
        "McNeese" : "McNeese State",
        "Middle Tenn." : "Middle Tennessee",
        "Saint Mary's (CA)" : "Saint Mary's",
        "UC San Diego" : "UC-San Diego",
        "SFA" : "Stephen F. Austin",
        "LMU (CA)" : "Loyola Marymount",
        "UNCW" : "UNC Wilmington",
        "UC Irvine" : "UC-Irvine",
        "UC Davis" : "UC-Davis",
        "St. Thomas (MN)" : "St. Thomas",
        "Southern Ill." : "Southern Illinois",
        "Northern Colo." : "Northern Colorado",
        "UC Santa Barbara" : "UCSB",
        "Southern Miss." : "Southern Miss",
        "UT Martin" : "UT-Martin",
        "Col. of Charleston" : "College of Charleston",
        "Massachusetts" : "UMass",
        "FIU" : "Florida International",
        "UTRGV" : "Texas-Rio Grande Valley",
        "UIW" : "Incarnate Word",
        "Charleston So." : "Charleston Southern",
        "Nicholls" : "Nicholls State",
        "A&M-Corpus Christi" : "Texas A&M-Corpus Christi",
        "FGCU" : "Florida Gulf Coast",
        "Southeast Mo. State" : "Southeast Missouri State",
        "CSUN" : "Cal State Northridge",
        "Central Ark." : "Central Arkansas",
        "App State" : "Appalachian State",
        "Central Conn. State" : "Central Connecticut",
        "Lamar University" : "Lamar",
        "Saint Joseph's" : "St. Joseph's",
        "UC Riverside" : "UC-Riverside",
        "SIUE" : "SIU-Edwardsville",
        "Northern Ariz." : "Northern Arizona",
        "Boston U." : "Boston University",
        "Eastern Wash." : "Eastern Washington",
        "N.C. A&T" : "North Carolina A&T",
        "Saint Peter's" : "St. Peter's",
        "Western Caro." : "Western Carolina",
        "Southeastern La." : "Southeastern Louisiana",
        "Army West Point" : "Army",
        "Southern U." : "Southern",
        "Ark.-Pine Bluff" : "Arkansas-Pine Bluff",
        "North Ala." : "North Alabama",
        "CSU Bakersfield" : "Cal State Bakersfield",
        "Eastern Ill." : "Eastern Illinois",
        "Loyola Chicago" : "Loyola (IL)",
        "Alcorn" : "Alcorn State",
        "Mount State Mary's" : "Mount St. Mary's",
        "NIU" : "Northern Illinois",
        "UAlbany" : "Albany (NY)",
        "UMass Lowell" : "UMass-Lowell",
        "IU Indy" : "IU Indianapolis",
        "UMES" : "Maryland-Eastern Shore",
        "Southern Ind." : "Southern Indiana",
        "Western Ill." : "Western Illinois",
        "Loyola Maryland" : "Loyola (MD)",
        "N.C. Central" : "North Carolina Central",
        "ULM" : "Louisiana-Monroe",
        "Saint Francis" : "Saint Francis (PA)",
        "Mississippi Val." : "Mississippi Valley State"
    }

    net_ratings['school'] = net_ratings['school'].replace(name_mapping)

    conf_standings = conf_standings.rename(columns={'rank' : 'ap_rank'})

    conf_standings = conf_standings.drop(["wins", "losses", "overall_win_pct"], axis=1)

    conf_standings['conf_rank'] = (
        conf_standings.groupby('conference')
        .cumcount()
        .add(1)
    )

    conf_standings = conf_standings.drop('conference', axis=1)

    net_ratings = net_ratings.merge(conf_standings, left_on="school", right_on="Team", how="left").drop("Team", axis=1).rename(columns={"rank" : "net_rank"})

    automatic_bids = net_ratings[net_ratings.conf_rank.eq(1)]
    automatic_bids.loc[:, "bid_type"] = "auto"

    at_large = net_ratings[net_ratings.conf_rank.ne(1)].sort_values('net_rank').head(37)
    at_large.loc[:, "bid_type"] = "at-large"
    
    # Next 8 are bubble teams
    bubble = net_ratings[net_ratings.conf_rank.ne(1)].sort_values('net_rank').iloc[37:45]
    bubble.loc[:, "bid_type"] = "bubble"
    
    # Track at-large rank for all non-auto-bid teams
    non_auto = net_ratings[net_ratings.conf_rank.ne(1)].sort_values('net_rank').copy()
    non_auto['at_large_rank'] = range(1, len(non_auto) + 1)
    
    # Create bid_type for all teams
    net_ratings = net_ratings.copy()
    net_ratings['bid_type'] = None  # Default to None
    
    # Set bid types for tournament teams
    net_ratings.loc[net_ratings['school'].isin(automatic_bids['school']), 'bid_type'] = 'auto'
    net_ratings.loc[net_ratings['school'].isin(at_large['school']), 'bid_type'] = 'at-large'
    net_ratings.loc[net_ratings['school'].isin(bubble['school']), 'bid_type'] = 'bubble'
    
    # Merge at_large_rank for all teams
    net_ratings = net_ratings.merge(
        non_auto[['school', 'at_large_rank']],
        on='school',
        how='left'
    )
    
    # Filter by conference if specified
    if conference:
        net_ratings = net_ratings[net_ratings["conference"] == conference]
    
    net_ratings = net_ratings.sort_values('net_rank')
    # Select and rename columns for clean output
    output = net_ratings[[
        "net_rank", "school", "conference", "w", "l",
        "quad1_w", "quad1_l", "quad2_w", "quad2_l",
        "quad3_w", "quad3_l", "quad4_w", "quad4_l",
        "bid_type", "at_large_rank"
    ]].rename(columns={
        "net_rank": "rank",
        "school": "team",
        "conference": "conference",
        "w": "wins",
        "l": "losses",
        "quad1_w": "q1_wins",
        "quad1_l": "q1_losses",
        "quad2_w": "q2_wins",
        "quad2_l": "q2_losses",
        "quad3_w": "q3_wins",
        "quad3_l": "q3_losses",
        "quad4_w": "q4_wins",
        "quad4_l": "q4_losses"
    })
    
    return jsonify(output.replace({np.nan: None}).to_dict(orient="records"))

@app.route("/standings/conference_standings", methods=["GET"])
def conference_standings():
    conference = request.args.get("conference")
    standings = get_conference_standings(conference)
    return jsonify(standings.to_dict(orient="records"))

@app.route("/pg_stats/conference_team_pg_leaders", methods=["GET"])
def conference_team_pg_stat_leaders():
    conference = request.args.get("conference")
    stat = request.args.get("stat")
    n = request.args.get("n")

    params = ((conference, stat, n) if n else (conference, stat))
    leaders = get_conference_team_pg_stat_leaders(*params)
    return jsonify(leaders.to_dict(orient="records"))

@app.route("/pg_stats/national_team_pg_leaders", methods=["GET"])
def national_team_pg_stat_leaders():
    stat = request.args.get("stat")
    n = request.args.get("n")

    if n:
        leaders = get_national_team_pg_stat_leaders(stat, n)
    else:
        leaders = get_national_team_pg_stat_leaders(stat)

    return jsonify(leaders.to_dict(orient="records"))

@app.route("/pg_stats/national_player_pg_rank", methods=["GET"])
def national_player_rank():
    stat = request.args.get("stat")
    player = request.args.get("player")

    return get_national_player_pg_stat_rank(stat, player)

@app.route("/pg_stats/conference_player_pg_rank", methods=["GET"])
def conference_player_rank():
    stat = request.args.get("stat")
    player = request.args.get("player")
    conf = request.args.get("conference")

    return get_conference_player_pg_stat_rank(conf, stat, player)

@app.route("/pg_stats/team_player_pg_rank", methods=["GET"])
def team_pg_rank():
    stat = request.args.get("stat")
    player = request.args.get("player")
    team = request.args.get("team")

    return get_team_player_pg_stat_rank(team, stat, player)

@app.route("/pg_stats/national_team_pg_rank", methods=["GET"])
def national_team_rank():
    stat = request.args.get("stat")
    team = request.args.get("team")

    return get_national_team_pg_stat_rank(stat, team)

@app.route("/pg_stats/conference_team_pg_rank", methods=["GET"])
def conference_team_rank():
    stat = request.args.get("stat")
    team = request.args.get("team")
    conf = request.args.get("conference")

    return get_conference_team_pg_stat_rank(conf, team, stat)

@app.route("/ratings/team_sos", methods=["GET"])
def team_sos():
    team = request.args.get("team")

    sos = get_team_sos(team, team_ratings)
    return jsonify({"SOS" : sos})

@app.route("/ratings/national_sos_rankings", methods=["GET"])
def nation_sos_rankings():
    n = request.args.get("n")
    top_n_net = request.args.get("top_n_net")
    sort_by = request.args.get("sort_by")
    find_rank = request.args.getlist("find_rank")

    kwargs = {}

    if n is not None:
        kwargs["n"] = int(n)

    if top_n_net is not None:
        kwargs["top_n_net"] = int(top_n_net)

    if sort_by is not None:
        kwargs["sort_by"] = sort_by

    if find_rank is not None:
        kwargs["find_rank"] = find_rank

    if find_rank:
        rankings, found_rank = get_national_sos_rankings(team_ratings=team_ratings, **kwargs)
    else:
        rankings = get_national_sos_rankings(team_ratings=team_ratings, **kwargs)
        found_rank = None

    response = {"rankings": rankings.to_dict(orient="records")}

    if found_rank is not None:
        response["found_rank"] = {team: int(rank) for team, rank in found_rank.items()}

    return jsonify(response)

@app.route("/filter/player_performance_filter", methods=["GET"])
def performance_filter():
    filter_dict = json.loads(request.args.get("filters"))
    result = player_pg_performance_filter(filter_dict)
    return jsonify(result.to_dict(orient="records"))

@app.route("/pg_stats/team_player_stat_leaders", methods=["GET"])
def team_player_stat_leaders():
    team = request.args.get("team")
    stat = request.args.get("stat")
    leaders = get_team_player_pg_stat_leaders(team, stat)
    return leaders.to_dict(orient="records")

@app.route("/games/box_score", methods=["GET"])
def game_box_score():
    gameID = request.args.get("gameID")
    box_score = players_box_df[players_box_df.gameid.eq(gameID)]
    teams = [box_score.iloc[0]["team"], box_score.iloc[0]["opponent"]]
    response = {}
    response["venue"] = box_score.iloc[0]["venue"]
    
    # Get location from matchups_df since it's not in players_box_df
    try:
        matchup = matchups_df[matchups_df.gameid.eq(gameID)]
        if not matchup.empty:
            response["location"] = matchup.iloc[0]["location"]
        else:
            response["location"] = "N/A"
    except:
        response["location"] = "N/A"
    
    for team in teams:
        team_box_score = box_score[box_score.team.eq(team)]
        team_box_score["role"] = pd.Categorical(team_box_score["role"], categories=["Starter", "Reserve"], ordered=True)
        team_box_score = team_box_score.sort_values(["role", "player"])
        response[team] = team_box_score.drop(["date", "gameid", "result", "team"], axis=1).replace(np.nan, None).to_dict(orient="records")
    return jsonify(response)

@app.route("/players/player_photos", methods=["GET"])
def player_photo():
    player = request.args.get("player")
    team = request.args.get("team")

    if team:
        player_str = f"{player}|{team}"
        result = player_photos_df[player_photos_df["Player"].eq(player_str)]
    
    else:
        result = player_photos_df[player_photos_df["Player"].eq(player)]

    if len(result) > 0:
        link = result.iloc[0]["Link"]
        return jsonify({"photo_url": link})
    else:
        return jsonify({"error": "Player not found"}), 404

@app.route("/teams/future_team_games", methods=["GET"])
def team_future_games():
    team = request.args.get("team")
    current_date = datetime.strptime(request.args.get("date"), "%Y-%m-%d").date()

    future_games = schedule_df[schedule_df.team.eq(team) & schedule_df.date.gt(current_date)][["date", "team", "opponent", "location"]]
    return jsonify(future_games.to_dict(orient="records"))

@app.route("/games/todays_games", methods=["GET"])
def todays_games():
    """Get all games for a specific date"""
    date_str = request.args.get("date")
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        
        # Ensure schedule_df date column is in proper format
        schedule_copy = schedule_df.copy()
        if not pd.api.types.is_datetime64_any_dtype(schedule_copy['date']):
            schedule_copy['date'] = pd.to_datetime(schedule_copy['date']).dt.date
        
        # Get games from schedule for the target date
        games = schedule_copy[schedule_copy['date'] == target_date].copy()
        
        # Drop any existing rank columns if they exist
        columns_to_drop = [c for c in ['team_rank', 'opponent_rank'] if c in games.columns]
        if columns_to_drop:
            games.drop(columns=columns_to_drop, inplace=True)
        
        # Merge with AP poll rankings for team
        games = games.merge(ap_poll[['Team', 'rank']], left_on='team', right_on='Team', how='left')
        games.rename(columns={'rank': 'team_rank'}, inplace=True)
        games.drop(columns=['Team'], inplace=True)
        
        # Merge with AP poll rankings for opponent
        games = games.merge(ap_poll[['Team', 'rank']], left_on='opponent', right_on='Team', how='left')
        games.rename(columns={'rank': 'opponent_rank'}, inplace=True)
        games.drop(columns=['Team'], inplace=True)
        
        # Deduplicate - each game appears twice (once per team)
        # Keep only one row per unique game
        games_deduplicated = []
        seen_matchups = set()
        
        for _, game in games.iterrows():
            team1_name = game["team"]
            team2_name = game["opponent"]
            matchup = tuple(sorted([team1_name, team2_name]))
            if matchup not in seen_matchups:
                seen_matchups.add(matchup)
                # Get logos for both teams
                team1_logo = None
                team2_logo = None
                try:
                    team1_logo_row = logo_images_df[logo_images_df['team'] == team1_name]
                    if not team1_logo_row.empty:
                        team1_logo = team1_logo_row.iloc[0]["logo_url"]
                except:
                    pass
                try:
                    team2_logo_row = logo_images_df[logo_images_df['team'] == team2_name]
                    if not team2_logo_row.empty:
                        team2_logo = team2_logo_row.iloc[0]["logo_url"]
                except:
                    pass
                
                # Get ranks safely
                team1_rank = None
                team2_rank = None
                try:
                    if "team_rank" in game.index and pd.notna(game["team_rank"]):
                        team1_rank = int(game["team_rank"])
                except:
                    pass
                try:
                    if "opponent_rank" in game.index and pd.notna(game["opponent_rank"]):
                        team2_rank = int(game["opponent_rank"])
                except:
                    pass
                    
                games_deduplicated.append({
                    "date": str(game["date"]),
                    "team1": team1_name,
                    "team1_logo": team1_logo,
                    "team1_rank": team1_rank,
                    "team2": team2_name,
                    "team2_logo": team2_logo,
                    "team2_rank": team2_rank,
                    "location": game["location"] if "location" in game.index else "TBD"
                })
        
        return jsonify({"games": games_deduplicated, "count": len(games_deduplicated)})
    except Exception as e:
        print(f"Error in todays_games: {e}")
        return jsonify({"games": [], "count": 0, "error": str(e)})

@app.route("/games/recent_games", methods=["GET"])
def recent_games():
    """Get recent completed games from yesterday to 7 days ago"""
    try:
        n = int(request.args.get("n", 12))
        
        # Calculate date range: yesterday to 7 days ago
        from datetime import timedelta
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        
        # Ensure matchups_df date column is in proper format
        matchups_copy = matchups_df.copy()
        if not pd.api.types.is_datetime64_any_dtype(matchups_copy['date']):
            matchups_copy['date'] = pd.to_datetime(matchups_copy['date'])
        else:
            matchups_copy['date'] = pd.to_datetime(matchups_copy['date'])
        
        # Convert to date for comparison
        matchups_copy['date_only'] = matchups_copy['date'].dt.date
        
        # Filter games within the date range
        recent = matchups_copy[
            (matchups_copy['date_only'] == yesterday)
        ].sort_values("date", ascending=False)
        
        # Deduplicate games
        games_deduplicated = []
        seen_games = set()
        
        for _, game in recent.iterrows():
            game_key = (str(game["date_only"]), tuple(sorted([game["team"], game["opponent"]])))
            if game_key not in seen_games:
                seen_games.add(game_key)
                # Get logos for both teams
                team1_logo = None
                team2_logo = None
                try:
                    team1_logo_row = logo_images_df[logo_images_df['team'] == game["team"]]
                    if not team1_logo_row.empty:
                        team1_logo = team1_logo_row.iloc[0]["logo_url"]
                except:
                    pass
                try:
                    team2_logo_row = logo_images_df[logo_images_df['team'] == game["opponent"]]
                    if not team2_logo_row.empty:
                        team2_logo = team2_logo_row.iloc[0]["logo_url"]
                except:
                    pass
                    
                games_deduplicated.append({
                    "date": str(game["date_only"]),
                    "game_id": game["gameid"],
                    "team1": game["team"],
                    "team1_logo": team1_logo,
                    "team1_rank": int(game["team_rank"]) if pd.notna(game.get("team_rank")) else None,
                    "team1_pts": int(game["team_pts"]),
                    "team2": game["opponent"],
                    "team2_logo": team2_logo,
                    "team2_rank": int(game["opponent_rank"]) if pd.notna(game.get("opponent_rank")) else None,
                    "team2_pts": int(game["opponent_pts"]),
                    "location": game.get("location", "N/A")
                })
                if len(games_deduplicated) >= n:
                    break
        
        return jsonify({"games": games_deduplicated})
    except Exception as e:
        print(f"Error in recent_games: {e}")
        return jsonify({"games": [], "error": str(e)})

@app.route("/bracketology/update_bracket", methods=["GET"])
def update_bracket():
    show_bracketology()
    return jsonify({"response" : 200})

@app.route("/predict/game_points", methods=["GET"])
def get_pt_predictions():
    team = request.args.get("team")
    opponent = request.args.get("opponent")
    gamedate = request.args.get("gamedate")
    location = request.args.get("location")

    result = get_or_create_prediction(
        team,
        opponent,
        gamedate,
        location,
    )

    return jsonify(result)

@app.route("/predict/game_metrics", methods=["POST"])
def game_metrics():
    payload = request.get_json()

    game_result = payload["game_result"]
    n_samples = payload.get("n_samples", 20000)
    sims = payload.get("sims", 200)
    blowout_margin = payload.get("blowout_margin", 15.0)
    gamedate = payload.get("gamedate")

    # Extract team names from game_result
    teams = list(game_result.keys())
    if len(teams) != 2:
        return jsonify({"error": "game_result must contain exactly 2 teams"}), 400
    
    team, opponent = teams[0], teams[1]

    # Try to get from cache if gamedate is provided
    if gamedate:
        print("Checking cache for existing metrics...")
        cached_metrics = get_or_create_metrics(
            team, opponent, gamedate,
            n_samples=n_samples,
            sims=sims,
            blowout_margin=blowout_margin
        )
        
        if cached_metrics is not None:
            print("Found cached metrics, returning cached metrics...")
            return jsonify(cached_metrics)

    # Compute metrics
    metrics = matchup_distribution_metrics(
        game_result,
        n_samples=n_samples,
        sims=sims,
        blowout_margin=blowout_margin
    )

    # Store in cache if gamedate is provided
    if gamedate:
        store_metrics(
            team, opponent, gamedate, metrics,
            n_samples=n_samples,
            sims=sims,
            blowout_margin=blowout_margin
        )
        print("Stored computed metrics in cache.")

    return jsonify(metrics)

if __name__ == "__main__":
    app.run(debug=False, port=4000, host='0.0.0.0')

