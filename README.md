# NCAAPlatform

A comprehensive NCAA Men's Basketball analytics platform featuring data collection, machine learning predictions, and interactive visualizations.

## 🏀 Overview

NCAAPlatform is a full-stack application that scrapes NCAA basketball data from Sports Reference, stores it in a PostgreSQL database, trains machine learning models for game predictions, and provides an interactive web interface for exploring team statistics, NET rankings, and conference standings.

## ✨ Features

- **Automated Data Collection**: Web scraping of box scores, player stats, and game results from Sports Reference
- **Machine Learning Predictions**: Trained models for predicting game outcomes
- **Interactive Dashboard**: Modern web interface with team statistics and rankings
- **Real-time NET Ratings**: Fetch and display current NCAA NET rankings
- **Conference Standings**: View standings for all major conferences
- **Historical Data Analysis**: Track team and player performance over time

## 🛠️ Tech Stack

### Backend
- **Python 3.x**
- **PostgreSQL**: Database for storing game data, player stats, and matchup information
- **Libraries**:
  - `pandas` & `numpy`: Data manipulation and analysis
  - `BeautifulSoup4`: Web scraping
  - `requests`: HTTP requests for data fetching
  - `psycopg2`: PostgreSQL database adapter
  - `pickle`: Model serialization
  - `scikit-learn`: Machine learning (implied from best_model.pkl)

### Frontend
- **JavaScript**: Interactive UI components
- **HTML/CSS**: Web interface
- **Jupyter Notebook**: Data exploration and model development

## 📁 Project Structure

```
NCAAPlatform/
├── backend/
│   ├── data/              # Data storage
│   ├── models/            # ML model files
│   ├── stat_api.py        # API for fetching stats and NET ratings
│   ├── update_and_train.py # Data pipeline and training scripts
│   └── team_ratings.pkl   # Serialized team ratings
├── development/           # Development notebooks and scripts
├── public/               # Static assets
├── src/
│   ├── components/       # Reusable UI components
│   ├── listeners/        # Event listeners
│   ├── state/           # State management
│   ├── utils/           # Utility functions
│   └── main.js          # Main application entry point
├── best_model.pkl        # Trained prediction model
└── script.js            # Main application logic
```

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- PostgreSQL 12+
- pip (Python package manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/smileytr25/NCAAPlatform.git
   cd NCAAPlatform
   ```

2. **Install Python dependencies**
   ```bash
   pip install pandas numpy beautifulsoup4 requests psycopg2-binary scikit-learn
   ```

3. **Set up PostgreSQL database**
   ```bash
   createdb ncaa
   ```
   
   Configure your database connection in `backend/update_and_train.py`:
   ```python
   conn = psycopg2.connect(
       host="localhost",
       database="ncaa",
       port=5432
   )
   ```

4. **Initialize database tables**
   
   The script will automatically create tables for:
   - `players_box`: Player box scores
   - `players_box_advanced`: Advanced player statistics
   - `games`: Game results and metadata
   - `teams`: Team game data
   - `matchups`: Processed matchup features
   - `conferences`: Conference affiliations

### Usage

#### Collecting Data

Update your database with NCAA game data for a specific date range:

```bash
python backend/update_and_train.py --start_date 2024-11-01 --end_date 2024-12-31
```

This will:
1. Scrape game data from Sports Reference
2. Extract box scores and advanced statistics
3. Store data in PostgreSQL
4. Generate matchup features for ML models

#### Fetching NET Ratings

The `stat_api.py` file provides functions to fetch current NET ratings:

```python
from backend.stat_api import get_NET_ratings, get_conference_standings

# Get current NET ratings
net_ratings = get_NET_ratings()

# Get conference standings
big_ten_standings = get_conference_standings("Big Ten")
```

#### Running the Web Interface

Open `index.html` (if available) in a web browser, or set up a local server:

```bash
python -m http.server 8000
```

Then navigate to `http://localhost:8000`

## 📊 Data Schema

### Players Box Scores
- GameID, Player, Date, Team, Opponent
- Traditional stats: FGM, FGA, FG%, 3PM, 3PA, 3P%, FTM, FTA, FT%
- Rebounds: ORB, DRB, TRB
- Other: AST, STL, BLK, TOV, PF, PTS
- Advanced: TS%, eFG%, Usage%, ORtg, DRtg, BPM

### Matchups
- Team and opponent statistics
- Win/loss records
- Offensive and defensive ratings
- Pace and efficiency metrics
- Ranking information

## 🤖 Machine Learning

The platform includes pre-trained models (`best_model.pkl`, `team_ratings.pkl`) for:
- Game outcome predictions
- Team strength ratings
- Matchup analysis

Models are trained on historical features including:
- Team offensive/defensive ratings
- Win percentage trends
- Ranking information
- Home/away performance
- Conference strength

## 🔄 Data Update Workflow

1. **Scraping**: Fetch game data from Sports Reference
2. **Parsing**: Extract box scores, line scores, and four factors
3. **Storage**: Insert into PostgreSQL with conflict handling
4. **Feature Engineering**: Calculate cumulative stats, ratings, and advanced metrics
5. **Model Training**: Update prediction models with new data

## ⚠️ Rate Limiting

The scraper implements throttling to respect Sports Reference's rate limits:
- Default: 15 requests per 60 seconds
- Automatic retry with exponential backoff
- 60-second pause between dates

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Data sourced from [Sports Reference](https://www.sports-reference.com/cbb/)
- NET ratings from NCAA official sources

## 📧 Contact

Project Link: [https://github.com/smileytr25/NCAAPlatform](https://github.com/smileytr25/NCAAPlatform)

---

**Note**: This project is for educational and personal use. Please respect Sports Reference's terms of service and rate limits when scraping data.