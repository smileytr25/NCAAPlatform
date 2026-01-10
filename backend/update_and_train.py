import pandas as pd
import numpy as np
import requests
from bs4 import BeautifulSoup, Comment
import time
from io import StringIO
import pickle 
import argparse
import os
import psycopg2
import argparse 
import unicodedata

def normalize_name(s):
    if s is None:
        return None

    # Fix mojibake (UTF-8 mis-decoded as Latin-1)
    try:
        s = s.encode("latin1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass

    # Unicode normalization
    s = unicodedata.normalize("NFKC", s)

    # Standardize apostrophes
    s = s.replace("’", "'").replace("‘", "'")

    return s.strip()

conn = psycopg2.connect(
    host="localhost",
    database="ncaa",
    port = 5432
)

cursor = conn.cursor()

def get_game_box_score(game_link: str, date: str, gameID: str) -> pd.DataFrame:
    """Get the box score for a given game link."""
    box_score_url = f"https://www.sports-reference.com{game_link}"
    r = requests.get(box_score_url)
    if r.status_code == 404:
        return 
    if r.status_code != 200:
        print(f"Rate limited. Waiting {r.headers['Retry-After']} seconds.")
        time.sleep(int(r.headers["Retry-After"]))
        r = requests.get(box_score_url)
        
    soup = BeautifulSoup(r.text, "html.parser")
    comments = soup.find_all(string=lambda s: isinstance(s, Comment))
    line_score = None
    four_factors = None
    for c in comments:
        if '<table' in c and 'id="line-score"' in c:
            line_score = BeautifulSoup(c, "html.parser").find("table", id="line-score")
        elif '<table' in c and 'id="four-factors"' in c:
            four_factors = BeautifulSoup(c, "html.parser").find("table", id="four-factors")
    box_score_basics = soup.find_all("table", id=lambda x: x and x.startswith("box-score-basic-"))
    away_box_score_basic, home_box_score_basic = box_score_basics
    box_score_advanced = soup.find_all("table", id=lambda x: x and x.startswith("box-score-advanced-"))
    away_box_score_advanced, home_box_score_advanced = box_score_advanced
    where = soup.find("div", class_="scorebox_meta").find_all("div")[1].text.replace('"', '')

    line_score = pd.read_html(StringIO(str(line_score)))[0]
    four_factors = pd.read_html(StringIO(str(four_factors)))[0]
    away_box_score_basic = pd.read_html(StringIO(str(away_box_score_basic)))[0]
    home_box_score_basic = pd.read_html(StringIO(str(home_box_score_basic)))[0]
    away_box_score_advanced = pd.read_html(StringIO(str(away_box_score_advanced)))[0]
    home_box_score_advanced = pd.read_html(StringIO(str(home_box_score_advanced)))[0]

    box_score_dict =  {
        "GameID" : gameID,
        "Date" : date,
        "Venue" : where,
        "line_score": line_score,
        "four_factors": four_factors,
        "away_box_score_basic": away_box_score_basic,
        "home_box_score_basic": home_box_score_basic,
        "away_box_score_advanced": away_box_score_advanced,
        "home_box_score_advanced": home_box_score_advanced,
    }

    return box_score_dict

box_scores_url = "https://www.sports-reference.com/cbb/boxscores/index.cgi?month={}&day={}&year={}"

def get_day_games_data(month: int, day: int, year: int, throttle: int = 15, throttle_time: int = 60) -> pd.DataFrame:
    """Get all games data for a given day."""
    date = f"{year}-{month:02d}-{day:02d}"
    r = requests.get(box_scores_url.format(month, day, year))
    if r.status_code != 200:
        print(f"Rate limited. Waiting {r.headers['Retry-After']} seconds.")
        time.sleep(int(r.headers["Retry-After"]))
        r = requests.get(box_scores_url.format(month, day, year))
    soup = BeautifulSoup(r.text, "html.parser")
    summaries = soup.find("div", class_="game_summaries")
    if summaries is None:
        return None
    
    men_games = summaries.find_all("div", class_="game_summary nohover gender-m")
    men_game_data_rows = []
    men_team_data_rows = []
    men_game_box_scores = []

    pages_visited = 0
    start_time = time.time()
    for game in men_games:
        teams = game.find_all("tr", class_=["winner", "loser"])
        if teams[0].find_all("td")[-2].text == "":
            continue
        if len(teams) < 2:
            continue
        for team in teams:
            location = "home" if teams.index(team) == 1 else "away"
            team_name = team.find("a").text
            pollrank = team.find("span", class_="pollrank")
            if pollrank:
                rank = pollrank.text.replace("(", "").replace(")", "")
            else: 
                rank = "NR"
            points = team.find_all("td")[-2].text
            team_data_row = {
                "GameID": f"{date}-{teams[0].find('a').text}-vs-{teams[1].find('a').text}-m",
                "Date": date,
                "Team": team_name,
                "Location": location,
                "Rank": rank,
                "Points": points,
                "Result": "W" if location == "home" and int(points) > int(teams[0].find_all("td")[-2].text) else 
                          "L" if location == "home" else
                          "W" if location == "away" and int(points) > int(teams[1].find_all("td")[-2].text) else 
                          "L"
            }
            men_team_data_rows.append(team_data_row)

        game_link = game.find("td", class_="right gamelink").find("a")["href"]

        gameID = f"{date}-{teams[0].find('a').text}-vs-{teams[1].find('a').text}-m"

        box_score_dict = get_game_box_score(game_link, date, gameID)

        men_game_box_scores.append(box_score_dict)

        game_data_row = {
            "GameID": gameID,
            "Date": date,
            "Venue": box_score_dict["Venue"],
            "Home Team": teams[1].find("a").text,
            "Home Rank": team_data_row["Rank"] if team_data_row["Location"] == "home" else
                         teams[1].find("span", class_="pollrank").text.replace("(", "").replace(")", "") if teams[1].find("span", class_="pollrank") else "NR",
            "Home Points": teams[1].find_all("td")[-2].text,
            "Away Team": teams[0].find("a").text,
            "Away Rank": team_data_row["Rank"] if team_data_row["Location"] == "away" else
                         teams[0].find("span", class_="pollrank").text.replace("(", "").replace(")", "") if teams[0].find("span", class_="pollrank") else "NR",
            "Away Points": teams[0].find_all("td")[-2].text,
            "Winner": teams[1].find("a").text if int(teams[1].find_all("td")[-2].text) > int(teams[0].find_all("td")[-2].text) else teams[0].find("a").text
        }
        men_game_data_rows.append(game_data_row)

        print(f"Done with {game_data_row['Away Team']} @ {game_data_row['Home Team']} on {game_data_row['Date']}")
        
        pages_visited += 1
        if pages_visited >= throttle:
            sleep_time = max(throttle_time - (time.time() - start_time), 0)
            print(f"Sleeping for {sleep_time:.2f} seconds")
            time.sleep(sleep_time)
            start_time = time.time()
            pages_visited = 0

    men_games_df = pd.DataFrame(men_game_data_rows)
    men_teams_df = pd.DataFrame(men_team_data_rows)

    return men_games_df, men_teams_df, men_game_box_scores

def get_season_data(dates: list[tuple[int, int, int]], throttle: int = 15, throttle_time: int = 60):
    """Get all season data for given"""
    games_df = pd.DataFrame()
    teams_df = pd.DataFrame()
    box_scores = []
    for month, day, year in dates:
        data = get_day_games_data(month, day, year, throttle, throttle_time)
        if data is None:
            continue

        men_games_df, men_teams_df, men_game_box_scores = data 
        games_df = pd.concat([games_df, men_games_df], ignore_index=True)
        teams_df = pd.concat([teams_df, men_teams_df], ignore_index=True)
        box_scores.extend(men_game_box_scores)
        print("Done with date:", f"{year}-{month:02d}-{day:02d}")
        print("Sleeping for 60 seconds before next date...")
        if (month, day, year) != dates[-1]:
            time.sleep(60)
    return games_df, teams_df, box_scores

def get_dates(start, end):
    """Generate a list of dates between start and end."""
    from datetime import datetime, timedelta
    start_date = datetime.strptime(start, "%Y-%m-%d")
    end_date = datetime.strptime(end, "%Y-%m-%d")
    delta = end_date - start_date
    dates = []
    for i in range(delta.days + 1):
        day = start_date + timedelta(days=i)
        dates.append((day.month, day.day, day.year))
    return dates

def format_line_score(line_score: pd.DataFrame) -> pd.DataFrame:
    """Format the line score dataframe."""
    data = {
        "Team" : line_score[("Scoring", "Unnamed: 0_level_1")],
        "H1" : line_score[("Scoring", "1")],
        "H2" : line_score[("Scoring", "2")],
        "T" : line_score[("Scoring", "T")],
    }
    if "OT" in line_score[("Scoring",)].columns:
        data["OT"] = line_score[("Scoring", "OT")]
    line_score = pd.DataFrame(data)
    return line_score

def format_four_factors(four_factors: pd.DataFrame) -> pd.DataFrame:
    """Format the four factors dataframe."""
    data = {
        "Team" : four_factors[("Unnamed: 0_level_0", "Unnamed: 0_level_1")],
        "Pace" : four_factors[("Unnamed: 1_level_0", "Pace")],
        "eFG%" : four_factors[("Four Factors", "eFG%")],
        "TOV%" : four_factors[("Four Factors", "TOV%")],
        "ORB%" : four_factors[("Four Factors", "ORB%")],
        "FT/FGA" : four_factors[("Four Factors", "FT/FGA")],
        "ORtg" : four_factors[("Unnamed: 6_level_0", "ORtg")],
    }
    four_factors = pd.DataFrame(data)
    return four_factors

def format_box_score_basic(box_score: dict, location: str) -> pd.DataFrame:
    """Format the box score basic dataframe."""
    gameID = box_score["GameID"]
    date = box_score["Date"]
    box_score_basic = box_score["away_box_score_basic"] if location == "away" else box_score["home_box_score_basic"]
    team = box_score["line_score"].iloc[0,0] if location == "away" else box_score["line_score"].iloc[1,0]
    opp_team = box_score["line_score"].iloc[1,0] if location == "away" else box_score["line_score"].iloc[0,0]
    result = box_score["line_score"].iloc[0, -1] > box_score["line_score"].iloc[1, -1] if location == "away" else box_score["line_score"].iloc[1, -1] > box_score["line_score"].iloc[0, -1]
    box = "W" if result else "L" 

    data = {
        "Player" : box_score_basic[("Unnamed: 0_level_0", "Starters")] if "Starters" in box_score_basic[("Unnamed: 0_level_0",)].columns else box_score_basic[("Unnamed: 0_level_0", "Player")],
        "GameID" : gameID,
        "Date" : date, 
        "Team" : [team] * len(box_score_basic),
        "Opponent" : [opp_team] * len(box_score_basic),
        "MP" : box_score_basic[("Basic Box Score Stats", "MP")],
        "FG" : box_score_basic[("Basic Box Score Stats", "FG")],
        "FGA" : box_score_basic[("Basic Box Score Stats", "FGA")],
        "FG%" : box_score_basic[("Basic Box Score Stats", "FG%")],
        "2P" : box_score_basic[("Basic Box Score Stats", "2P")],
        "2PA" : box_score_basic[("Basic Box Score Stats", "2PA")],
        "2P%" : box_score_basic[("Basic Box Score Stats", "2P%")],
        "3P" : box_score_basic[("Basic Box Score Stats", "3P")],
        "3PA" : box_score_basic[("Basic Box Score Stats", "3PA")],
        "3P%" : box_score_basic[("Basic Box Score Stats", "3P%")],
        "FT" : box_score_basic[("Basic Box Score Stats", "FT")],
        "FTA" : box_score_basic[("Basic Box Score Stats", "FTA")],
        "FT%" : box_score_basic[("Basic Box Score Stats", "FT%")],
        "ORB" : box_score_basic[("Basic Box Score Stats", "ORB")],
        "DRB" : box_score_basic[("Basic Box Score Stats", "DRB")],
        "TRB" : box_score_basic[("Basic Box Score Stats", "TRB")],
        "AST" : box_score_basic[("Basic Box Score Stats", "AST")],
        "STL" : box_score_basic[("Basic Box Score Stats", "STL")],
        "BLK" : box_score_basic[("Basic Box Score Stats", "BLK")],
        "TOV" : box_score_basic[("Basic Box Score Stats", "TOV")],
        "PF" : box_score_basic[("Basic Box Score Stats", "PF")],
        "PTS" : box_score_basic[("Basic Box Score Stats", "PTS")],
        "GmSc" : box_score_basic[("Basic Box Score Stats", "GmSc")],
        "Result" : [box] * len(box_score_basic)
    }

    role = ["Starter" for i in range(5)] + ["Reserve" for i in range(len(box_score_basic) - 5)]
    data["Role"] = role
    box_score_basic = pd.DataFrame(data)
    box_score_basic["Venue"] = box_score["Venue"]
    box_score_basic = box_score_basic.drop(5, axis=0)
    return box_score_basic

def format_box_score_advanced(box_score: dict, location: str) -> pd.DataFrame:
    """Format the box score advanced dataframe."""
    box_score_advanced = box_score["away_box_score_advanced"] if location == "away" else box_score["home_box_score_advanced"]
    team = box_score["line_score"].iloc[0,0] if location == "away" else box_score["line_score"].iloc[1,0]
    opp_team = box_score["line_score"].iloc[1,0] if location == "away" else box_score["line_score"].iloc[0,0]
    result = box_score["line_score"].iloc[0, -1] > box_score["line_score"].iloc[1, -1] if location == "away" else box_score["line_score"].iloc[1, -1] > box_score["line_score"].iloc[0, -1]
    box = "W" if result else "L"

    data = {
        "Player" : box_score_advanced[("Unnamed: 0_level_0", "Starters")] if "Starters" in box_score_advanced[("Unnamed: 0_level_0",)].columns else box_score_advanced[("Unnamed: 0_level_0", "Player")],
        "GameID" : box_score["GameID"],
        "Team" : [team] * len(box_score_advanced),
        "Opponent" : [opp_team] * len(box_score_advanced),
        "MP" : box_score_advanced[("Advanced Box Score Stats", "MP")],
        "TS%" : box_score_advanced[("Advanced Box Score Stats", "TS%")],
        "eFG%" : box_score_advanced[("Advanced Box Score Stats", "eFG%")],
        "3PAr" : box_score_advanced[("Advanced Box Score Stats", "3PAr")],
        "FTr" : box_score_advanced[("Advanced Box Score Stats", "FTr")],
        "ORB%" : box_score_advanced[("Advanced Box Score Stats", "ORB%")],
        "DRB%" : box_score_advanced[("Advanced Box Score Stats", "DRB%")],
        "TRB%" : box_score_advanced[("Advanced Box Score Stats", "TRB%")],
        "AST%" : box_score_advanced[("Advanced Box Score Stats", "AST%")],
        "STL%" : box_score_advanced[("Advanced Box Score Stats", "STL%")],
        "BLK%" : box_score_advanced[("Advanced Box Score Stats", "BLK%")],
        "TOV%" : box_score_advanced[("Advanced Box Score Stats", "TOV%")],
        "USG%" : box_score_advanced[("Advanced Box Score Stats", "USG%")],
        "ORtg" : box_score_advanced[("Advanced Box Score Stats", "ORtg")],
        "DRtg" : box_score_advanced[("Advanced Box Score Stats", "DRtg")],
        "Result" : [box] * len(box_score_advanced)
    }

    role = ["Starter" for i in range(5)] + ["Reserve" for i in range(len(box_score_advanced) - 5)]
    data["Role"] = role

    if "BPM" in box_score_advanced[("Advanced Box Score Stats",)].columns:
        data["BPM"] = box_score_advanced[("Advanced Box Score Stats", "BPM")]
    else:
        data["BPM"] = [np.nan] * len(box_score_advanced)
        
    box_score_advanced = pd.DataFrame(data)
    box_score_advanced["Venue"] = box_score["Venue"]

    box_score_advanced = box_score_advanced.drop(5, axis=0)
    return box_score_advanced

def format_box_score(box_score: dict) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Format the box score dataframes."""
    four_factors = format_four_factors(box_score["four_factors"])
    away_box_score_basic = format_box_score_basic(box_score, "away")
    home_box_score_basic = format_box_score_basic(box_score, "home")
    away_box_score_advanced = format_box_score_advanced(box_score, "away")
    home_box_score_advanced = format_box_score_advanced(box_score, "home")
    return (four_factors, away_box_score_basic, home_box_score_basic, away_box_score_advanced, home_box_score_advanced)

def create_basic_player_games_df(box_scores: list[dict]) -> pd.DataFrame:
    """Create a dataframe of player games from box scores."""
    players_df = pd.DataFrame()
    for box in box_scores:
        box_score_home = box["home_box_score_basic"]
        box_score_away = box["away_box_score_basic"]
        players_df = pd.concat([players_df, box_score_home, box_score_away], ignore_index=True)
    return players_df

def create_advanced_player_games_df(box_scores: list[dict]) -> pd.DataFrame:
    """Create a dataframe of player games from box scores."""
    players_df = pd.DataFrame()
    for box in box_scores:
        box_score_home = box["home_box_score_advanced"]
        box_score_away = box["away_box_score_advanced"]
        players_df = pd.concat([players_df, box_score_home, box_score_away], ignore_index=True)
    return players_df

def get_team_totals_df(box_scores: list[dict]) -> pd.DataFrame:
    """Create a dataframe of team totals from box scores."""
    team_totals_df = pd.DataFrame()
    for box in box_scores:
        if "Player" not in box["home_box_score_basic"].columns:
            print(box["home_box_score_basic"].columns)
        home_box_score_basic = box["home_box_score_basic"]
        away_box_score_basic = box["away_box_score_basic"]
        if "Player" in box["home_box_score_basic"].columns:
            home_team_totals = home_box_score_basic[home_box_score_basic["Player"] == "School Totals"]
        else:
            home_team_totals = home_box_score_basic[home_box_score_basic["Starters"] == "School Totals"]
        away_team_totals = away_box_score_basic[away_box_score_basic["Player"] == "School Totals"]
        team_totals_df = pd.concat([team_totals_df, home_team_totals, away_team_totals], ignore_index=True)
    return team_totals_df

def update_data(date_start, date_end):
    dates = get_dates(date_start, date_end)
    games_df, teams_df, box_scores = get_season_data(dates)

    for box in box_scores:
        (four_factors, away_box_score_basic, home_box_score_basic, away_box_score_advanced, home_box_score_advanced) = format_box_score(box)
        box["four_factors"] = four_factors
        box["away_box_score_basic"] = away_box_score_basic
        box["home_box_score_basic"] = home_box_score_basic
        box["away_box_score_advanced"] = away_box_score_advanced
        box["home_box_score_advanced"] = home_box_score_advanced

    basic_players_box_df = create_basic_player_games_df(box_scores)
    advanced_players_box_df = create_advanced_player_games_df(box_scores)
    team_totals_df = get_team_totals_df(box_scores)
    team_totals_df = team_totals_df.drop(["Player", "Opponent", "Role", "GmSc", "GameID", "Date", "Venue"], axis=1)
    team_totals_df["W"] = (team_totals_df["Result"] == "W").astype(int)
    team_totals_df["L"] = (team_totals_df["Result"] == "L").astype(int)

    team_totals_df = team_totals_df.drop(["Result"], axis=1)

    team_totals_df[[i for i in team_totals_df.columns if i != "Team"]] = team_totals_df[[i for i in team_totals_df.columns if i != "Team"]].astype("float")

    team_totals = team_totals_df.groupby("Team").agg({
        "MP" : "sum",
        "FG" : "sum",
        "FGA" : "sum",
        "FT" : "sum",
        "FTA" : "sum",
        "3P" : "sum",
        "3PA" : "sum",
        "ORB" : "sum",
        "DRB" : "sum",
        "TRB" : "sum",
        "AST" : "sum",
        "STL" : "sum",
        "BLK" : "sum",
        "TOV" : "sum",
        "PF" : "sum",
        "PTS" : "sum",
        "W" : "sum",
        "L" : "sum",
        "FG%" : "mean",
        "FT%" : "mean",
        "3P%" : "mean",
        "2P%" : "mean",
    })

    team_totals = team_totals.round(2).reset_index()

    sql_order = [
        "GameID", "Player", "Date", "Team", "Opponent", "Venue", "Result", "Role",
        "MP", "FG", "FGA", "FG%", "3P", "3PA", "3P%", "2P", "2PA", "2P%",
        "FT", "FTA", "FT%", "ORB", "DRB", "TRB", "AST", "STL", "BLK", "TOV", "PF", "PTS", "GmSc"
    ]

    for index, row in basic_players_box_df[sql_order].iterrows():
        row = row.copy()
        row["Player"] = normalize_name(row["Player"])

        insert_query = """
        INSERT INTO players_box (
            gameid, player, date, team, opponent, venue, result, role,
            mp, fgm, fga, fg_pct, fg3m, fg3a, fg3_pct, fg2m, fg2a, fg2_pct,
            ftm, fta, ft_pct, orb, drb, trb, ast, stl, blk, tov, pf, pts, gmsc
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (gameid, player) DO NOTHING;
        """

        cursor.execute(insert_query, tuple(row))
        if index % 1000 == 0:
            conn.commit()   

    conn.commit()

    sql_order_adv = [
        "GameID", "Player", "Team", "Opponent", "Venue", "Result", "Role",
        "MP", "TS%", "eFG%", "3PAr", "FTr", "ORB%", "DRB%", "TRB%", "AST%",
        "STL%", "BLK%", "TOV%", "USG%", "ORtg", "DRtg", "BPM"
    ]

    for index, row in advanced_players_box_df[sql_order_adv].iterrows():
        row = row.copy()
        row["Player"] = normalize_name(row["Player"])

        insert_query = """
        INSERT INTO players_box_advanced (
            gameid, player, team, opponent, venue, result, role,
            mp, ts_pct, efg_pct, fg3a_ratio, fta_ratio, orb_pct, drb_pct, trb_pct, ast_pct,
            stl_pct, blk_pct, tov_pct, usg_pct, ortg, drtg, bpm
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (gameid, player) DO NOTHING;
        """
        cursor.execute(insert_query, tuple(row))
        if index % 1000 == 0:
            conn.commit()
    
    conn.commit()

    sql_order_games = [
        "GameID", "Date", "Venue", "Home Team", "Away Team",
        "Home Points", "Away Points", "Home Rank", "Away Rank", "Winner"
    ]
    for index, row in games_df[sql_order_games].iterrows():
        insert_query = """
        INSERT INTO games (
            gameid, date, venue, home_team, away_team,
            home_points, away_points, home_rank, away_rank, winner
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (gameid) DO NOTHING;
        """
        row["Home Rank"] = None if row["Home Rank"] == "NR" else int(row["Home Rank"])
        row["Away Rank"] = None if row["Away Rank"] == "NR" else int(row["Away Rank"])

        cursor.execute(insert_query, tuple(row))
        if index % 1000 == 0:
            conn.commit()

    conn.commit()

    sql_order_teams = [
        "GameID", "Team", "Location", "Rank", "Points", "Result"
    ]

    for index, row in teams_df[sql_order_teams].iterrows():
        insert_query = """
        INSERT INTO teams (
            gameid, team, location, rank, points, result
        ) VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (gameid, team) DO NOTHING;
        """
        row["Rank"] = None if row["Rank"] == "NR" else int(row["Rank"])
        cursor.execute(insert_query, tuple(row))
        if index % 1000 == 0:
            conn.commit()

    conn.commit()

    sql_order_team_totals = [
        "Team", "MP", "FG", "FGA", "FT", "FTA", "3P", "3PA", "ORB", "DRB",
        "TRB", "AST", "STL", "BLK", "TOV", "PF", "PTS", "W", "L",
        "FG%", "3P%", "FT%", "2P%"
    ]

    for index, row in team_totals[sql_order_team_totals].iterrows():
        insert_query = """
        INSERT INTO team_totals (
            team, mp, fgm, fga, ft, fta, fg3m, fg3a, orb, drb,
            trb, ast, stl, blk, tov, pf, pts, wins, losses,
            fg_pct, fg3_pct, ft_pct, fg2_pct
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s
        ) 
        ON CONFLICT (team) DO NOTHING;
        """
        cursor.execute(insert_query, tuple(row))
        if index % 1000 == 0:
            conn.commit()

    conn.commit()

def prepare_features(date_start, date_end):
    #Load in data
    cursor.execute("SELECT * FROM teams;")
    teams_df = pd.DataFrame(cursor.fetchall(), columns=[desc[0] for desc in cursor.description])

    cursor.execute("SELECT * FROM players_box;")
    players_df = pd.DataFrame(cursor.fetchall(), columns=[desc[0] for desc in cursor.description])

    cursor.execute("SELECT * FROM games;")
    games = pd.DataFrame(cursor.fetchall(), columns=[desc[0] for desc in cursor.description])

    players_df = players_df[players_df.player != "School Totals"]

    # Get games_before column
    df = players_df.copy()
    df = df.sort_values(['player', 'date']).copy()
    df['games_before'] = df.groupby('player').cumcount()

    # Get cumulative total stats
    df = df.sort_values(["player","date"]).reset_index(drop=True)

    # Fill nans 
    non_pct_cols = [col for col in df.columns 
                    if col.startswith('cum_') and not col.endswith(('pct', '_pct'))]
    df[non_pct_cols] = df[non_pct_cols].fillna(0)

    # Create team games dataframe
    team_stats = [
        "pts","trb","orb","drb","ast","stl","blk","tov",
        "fga","fgm","fg2m","fg2a","fg3m","fg3a","ftm","fta","pf"
    ]

    team_games = (
        df.groupby(["team", "gameid"], as_index=False)[team_stats]
        .sum()
    )

    # Add GameID to dataframe
    team_games = team_games.sort_values(["team", "gameid"]).reset_index(drop=True)
    game_dates = df[["gameid", "date"]].drop_duplicates()
    team_games = team_games.merge(
        game_dates,
        on=["gameid"],
        how="left"
    )
    team_games = team_games.sort_values(["team", "date"]).reset_index(drop=True)

    # Get team games before and game number
    team_games["games_before"] = team_games.groupby("team").cumcount()
    team_games["team_game_number"] = team_games["games_before"] + 1

    # Fill nans
    non_pct_cols = [col for col in team_games.columns 
                    if col.startswith('cum_') and not col.endswith(('pct', '_pct'))]
    team_games[non_pct_cols] = team_games[non_pct_cols].fillna(0)

    # Get matchups dataframe
    base = team_games.copy()
    opp = base.rename(
        columns={c: f"opp_{c}" for c in base.columns if c not in ["gameid"]}
    )

    matchups = base.merge(opp, on="gameid", how="left")
    matchups = matchups[matchups["team"] != matchups["opp_team"]].reset_index(drop=True)
    # Get game win and loss column
    matchups = matchups.sort_values(["team", "date"]).reset_index(drop=True)
    matchups["win"] = (matchups["pts"] > matchups["opp_pts"]).astype(int)
    matchups["loss"] = 1 - matchups["win"]

    # Get the wins_before column
    matchups = matchups.sort_values(["team", "date"]).reset_index(drop=True)
    
    for stat in ["win"]:
        s = matchups.groupby("team")[stat].cumsum()
        s = s.groupby(matchups["team"]).shift(1)
        matchups["wins_before"] = s.fillna(0)

    # Get the losses_before column
    for stat in ["loss"]:
        s = matchups.groupby("team")[stat].cumsum()
        s = s.groupby(matchups["team"]).shift(1)
        matchups["losses_before"] = s.fillna(0)
    
    # Get the win_pct_before column
    matchups["win_pct_before"] = (
        matchups["wins_before"] /
        (matchups["wins_before"] + matchups["losses_before"]).replace(0, pd.NA)
    )
    matchups["win_pct_before"] = matchups["win_pct_before"].fillna(0)

    # Get opp win and loss colun
    matchups = matchups.sort_values(["opp_team", "opp_date"]).reset_index(drop=True)
    matchups["opp_win"]  = (matchups["opp_pts"] > matchups["pts"]).astype(int)
    matchups["opp_loss"] = 1 - matchups["opp_win"]

    # Get opp_wins_before and opp_losses_before columns
    for stat in ["opp_win"]:
        s = matchups.groupby("opp_team")[stat].cumsum()
        s = s.groupby(matchups["opp_team"]).shift(1)
        matchups["opp_wins_before"] = s.fillna(0)

    for stat in ["opp_loss"]:
        s = matchups.groupby("opp_team")[stat].cumsum()
        s = s.groupby(matchups["opp_team"]).shift(1)
        matchups["opp_losses_before"] = s.fillna(0)

    # Get opp_win_pct_before column
    matchups["opp_win_pct_before"] = (
        matchups["opp_wins_before"] /
        (matchups["opp_wins_before"] + matchups["opp_losses_before"]).replace(0, pd.NA)
    )
    matchups["opp_win_pct_before"] = matchups["opp_win_pct_before"].fillna(0)

    # Merge ranks into the matchups dataframe
    matchups = matchups.merge(
        teams_df,
        on=("gameid", "team"),
        how="left"
    )

    matchups = matchups.merge(
        teams_df,
        left_on=("gameid", "opp_team"),
        right_on=("gameid", "team"),
        how="left",
    )

    matchups = matchups.rename(columns={
        "team_x" : "team",
        "location_x" : "location",
        "rank_x" : "rank",
        "rank_y" : "opp_rank",
        "location_y" : "opp_location"
    }).drop(columns=[
        "points_x", "points_y", "result_x", "result_y", "team_y",
    ])

    # Type the rank and opp_rank columns as float
    matchups["rank"] = matchups["rank"].replace("NR", None).astype("float")
    matchups["opp_rank"] = matchups["opp_rank"].replace("NR", None).astype("float")

    # Get the team_is_ranked, opp_is_ranked, and team_is_higher_ranked flags
    matchups["team_is_ranked"] = matchups["rank"].notna().astype(int)
    matchups["opp_is_ranked"]  = matchups["opp_rank"].notna().astype(int)

    matchups["team_is_higher_ranked"] = (
        ((matchups["team_is_ranked"] == 1) & 
        (matchups["opp_is_ranked"] == 1) &
        (matchups["rank"] < matchups["opp_rank"])) |

        ((matchups["team_is_ranked"] == 1) &
        (matchups["opp_is_ranked"] == 0))
    )

    # Get game possession estimates    
    matchups["poss"] = matchups["fga"] - matchups["orb"] + matchups["tov"] + .475 * matchups["fta"]
    matchups["opp_poss"] = matchups["opp_fga"] - matchups["opp_orb"] + matchups["opp_tov"] + .475 * matchups["opp_fta"]

    # Get game ORtg, DRtg columns
    matchups["ortg"] = 100 * matchups["pts"] / matchups["poss"]
    matchups["opp_drtg"] = 100 * matchups["pts"] / matchups["poss"]
    matchups["drtg"] = 100 * matchups["opp_pts"] / matchups["opp_poss"]
    matchups["opp_ortg"] = 100 * matchups["opp_pts"] / matchups["opp_poss"]

    # Get NetRtg features
    matchups["netrtg"] = matchups["ortg"] - matchups["drtg"]
    matchups["opp_netrtg"] = matchups["opp_ortg"] - matchups["opp_drtg"]
   
    sql_order_matchups = [
        "gameid", "team", "opp_team", "date", "location", "opp_location", "poss", "opp_poss",
        "ortg", "opp_ortg", "drtg", "opp_drtg", "netrtg", "opp_netrtg", "games_before", "opp_games_before",
        "team_game_number", "opp_team_game_number", "wins_before", "losses_before", "opp_wins_before", "opp_losses_before",
        "win_pct_before", "opp_win_pct_before", "team_is_ranked", "opp_is_ranked", "team_is_higher_ranked", "rank", "opp_rank", 
        "win", "loss", "opp_win", "opp_loss", "pts", "opp_pts", "ast", "opp_ast",
        "trb", "opp_trb", "orb", "opp_orb", "drb", "opp_drb",
        "stl", "opp_stl", "blk", "opp_blk", "tov", "opp_tov", "pf", "opp_pf",
        "fgm", "opp_fgm", "fga", "opp_fga", "fg3m", "opp_fg3m", "fg3a", "opp_fg3a",
        "ftm", "opp_ftm", "fta", "opp_fta", "fg2m", "opp_fg2m", "fg2a", "opp_fg2a"
    ]

    for index, row in matchups[sql_order_matchups].iterrows():
        insert_query = """
        INSERT INTO matchups (
            gameid, team, opponent, date, location, opponent_location, team_poss, opponent_poss,
            team_ortg, opponent_ortg, team_drtg, opponent_drtg, team_netrtg,
            opponent_netrtg, team_games_before, opponent_games_before,
            team_game_number, opponent_game_number, team_wins_before,
            team_losses_before, opponent_wins_before, opponent_losses_before,
            team_winpct_before, opponent_winpct_before, team_is_ranked, opponent_is_ranked, team_is_higher_ranked,
            team_rank, opponent_rank, team_win, team_loss, opponent_win,
            opponent_loss, team_pts, opponent_pts, team_ast, opponent_ast,
            team_trb, opponent_trb, team_orb, opponent_orb, team_drb,
            opponent_drb, team_stl, opponent_stl, team_blk, opponent_blk,
            team_tov, opponent_tov, team_pf, opponent_pf, team_fgm,
            opponent_fgm, team_fga, opponent_fga, team_fg3m,
            opponent_fg3m, team_fg3a, opponent_fg3a, team_ftm,
            opponent_ftm, team_fta, opponent_fta, team_fg2m,
            opponent_fg2m, team_fg2a, opponent_fg2a
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (gameid, team) DO NOTHING;
        """

        row["rank"] = None if row["rank"] == "NR" or pd.isna(row["rank"]) else int(row["rank"])
        row["opp_rank"] = None if row["opp_rank"] == "NR" or pd.isna(row["opp_rank"]) else int(row["opp_rank"])
        row["team_is_ranked"] = True if row["team_is_ranked"] == 1 else False
        row["opp_is_ranked"] = True if row["opp_is_ranked"] == 1 else False
        row["team_is_higher_ranked"] = True if row["team_is_higher_ranked"] == 1 else False
        
        cursor.execute(insert_query, tuple(row))
        if index % 1000 == 0:
            conn.commit()
        
    conn.commit()

    sql = """
    INSERT INTO players_box_w_conferences
    SELECT
        pb.*,
        c.conference
    FROM players_box pb
    LEFT JOIN conferences c
    ON pb.team = c.team
    WHERE pb.date BETWEEN %s AND %s
    ON CONFLICT (gameid, player) DO NOTHING;
    """

    cursor.execute(sql, (date_start, date_end))
    conn.commit()

    sql = """
    DROP TABLE IF EXISTS matchups_w_conferences;
    DROP TABLE IF EXISTS teams_w_conferences;

    CREATE TABLE teams_w_conferences AS
    SELECT t.*, c.conference
    FROM teams t
    LEFT JOIN conferences c ON t.team = c.team;

    CREATE TABLE matchups_w_conferences AS
    SELECT m.*, c.conference AS team_conference, c2.conference AS opp_conference
    FROM matchups m
    LEFT JOIN conferences c ON m.team = c.team
    LEFT JOIN conferences c2 ON m.opponent = c2.team;
    """

    cursor.execute(sql)
    conn.commit()
    conn.close()

def model_and_train(start_date, end_date):
    update_data(start_date, end_date)
    prepare_features(start_date, end_date)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train model with date range")

    parser.add_argument("--start_date", type=str, required=True,
                        help="Start date in YYYY-MM-DD format")
    parser.add_argument("--end_date", type=str, required=True,
                        help="End date in YYYY-MM-DD format")

    args = parser.parse_args()

    model_and_train(start_date=args.start_date, end_date=args.end_date)

