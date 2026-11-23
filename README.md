# 🏡 House Price Prediction & Interactive ML Dashboard

A complete end-to-end Machine Learning and Data Science project that models residential house prices across major Indian cities (Bangalore, Chennai, Delhi, Hyderabad, Mumbai, and Pune). It combines rigorous statistical analysis, mathematical foundations (Linear Algebra & Calculus), and multiple regression models with an **interactive web dashboard** featuring real-time price estimation.

---

## 🌟 Key Features

- **⚡ Instant Price Predictor**:
  - **Sticky Quick-Predict Strip**: Estimate prices in seconds by selecting city, location, property type, area, and bedrooms directly from the top navigation bar.
  - **Full Customization Form**: Tune granular parameters including bathrooms, floor count, property age, parking spots, and furnishing status.
- **📊 Comprehensive Exploratory Data Analysis (EDA)**:
  - Central tendency and dispersion metrics.
  - Price distributions, skewness, kurtosis, and outlier detection (IQR & Z-score).
- **📐 Mathematical & Statistical Foundations**:
  - **Inferential Statistics**: Sampling methods (Simple Random, Systematic, Stratified), Law of Large Numbers (LLN), Bayes' Theorem, and Welch's t-test hypothesis testing.
  - **Correlation Matrix**: Interactive Pearson and Spearman correlation heatmaps.
  - **Linear Algebra**: Matrix operations ($X \cdot W + b$) showing manual NumPy calculations matching scikit-learn.
  - **Calculus & Gradient Descent**: Step-by-step cost function minimization ($MSE$) and weight convergence visualizations.
- **🤖 Model Comparison & Evaluation**:
  - Compares **Linear Regression**, **Decision Tree**, and **Random Forest Regressor**.
  - Metrics: $MAE$, $MSE$, $RMSE$, and $R^2$ scores along with 5-fold cross-validation and residual distributions.

---

## 📁 Repository Structure

```text
House_Price_Prediction/
│
├── dataset/
│   └── housing.csv                 # Cleaned residential housing dataset
│
├── notebooks/
│   └── house_price_prediction.ipynb # Step-by-step analysis & ML modeling notebook
│
├── website/                        # Interactive Dashboard
│   ├── index.html                  # Dashboard web UI
│   ├── app.js                      # Chart rendering & real-time client-side prediction
│   └── data.js                     # Pre-computed statistics and model parameters
│
├── build_website.py                # Script to re-train models & export data to website/data.js
├── generate_dataset.py             # Script to generate synthetic Indian housing dataset
├── requirements.txt                # Required Python packages
├── .gitignore                      # Git ignore patterns
└── README.md                       # Project documentation
```

---

## 🚀 Quick Start

### 1. View the Web Dashboard
No web server setup is strictly required! You can open the dashboard directly in your browser:
- Open [`website/index.html`](website/index.html) in any modern web browser (Chrome, Edge, Firefox, Safari).

### 2. Python Environment Setup
If you want to run the scripts or Jupyter notebook:

```bash
# Clone the repository
git clone https://github.com/<your-username>/House_Price_Prediction.git
cd House_Price_Prediction

# Create and activate a virtual environment (optional but recommended)
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Running Analysis & Notebook
Launch Jupyter Notebook to explore the step-by-step data science process:
```bash
jupyter notebook notebooks/house_price_prediction.ipynb
```

### 4. Updating the Dashboard Data
If you modify the dataset or modeling parameters, regenerate `website/data.js` by running:
```bash
python build_website.py
```

---

## 🛠 Tech Stack

- **Machine Learning & Data Science**: Python, NumPy, Pandas, Scikit-learn, SciPy
- **Data Visualization**: Chart.js, Matplotlib, Seaborn
- **Frontend / Dashboard**: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Bootstrap Icons

---

## 📄 License
This project is licensed under the MIT License - feel free to use and adapt it for learning and research purposes.
