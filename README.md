# Expense Tracker App


Expense Tracker is a highly polished, responsive expense tracking dashboard built with **HTML**, **Vanilla CSS**, **JavaScript (ES6)**, and a **Python (Flask)** backend with a **SQLite** database.

## Features
- **Dashboard Summary**: Real-time balance, income, and expense cards.
- **Data Visualization**:
  - Interactive categories breakdown doughnut chart (using Chart.js).
  - Cash flow trends line chart detailing monthly incomes vs expenses.
- **Complete CRUD Operations**: Create, read, update, and delete transaction history dynamically.
- **Search & Filter Controls**: Live-search titles and filter by transaction type or category.
- **Dynamic Category Swapping**: Form categories swap depending on whether you choose Income or Expense.
- **Premium Aesthetics**: Clean dark mode layout, frosted-glass effects (glassmorphism), subtle gradients, glowing indicators, responsive design, and smooth animations.

---

## Installation & Setup

### Prerequisites
- Python 3.8 or above installed on your system.

### Step 1: Install Dependencies
Open your terminal in this project directory and install the necessary package (`Flask`):
```bash
pip install -r requirements.txt
```

### Step 2: Run the Application
Start the Flask local development server:
```bash
python app.py
```

By default, Flask will run on **`http://127.0.0.1:5000`**.

### Step 3: Open in Browser
Open your web browser and navigate to:
[http://localhost:5000](http://localhost:5000)

The application database `expenses.db` will be initialized automatically with beautiful mock seed transactions so the charts and history load populated on the first boot.

---

## App Walkthrough & Screenshots

### 🖥️ 1. Main Dashboard View
The main application interface displaying real-time balance metrics, recent transactions table, and category filters.
![Main Dashboard]
(<img width="588" height="275" alt="Screenshot 2026-06-14 172456" src="https://github.com/user-attachments/assets/f261560e-27fa-4681-9b46-89df4cdb94b5" />
.png)

### 📊 2. Charts & Financial Visualizations
Dynamic doughnut breakdown of expenses by category and monthly cash flow trend charts.
![Recent Transactions]
(<img width="623" height="236" alt="Screenshot 2026-06-14 172602" src="https://github.com/user-attachments/assets/78ab1bb2-8972-4e0f-8a48-84d3dd7d8692" />)

### 📝 3. Add & Edit Transaction Dialog
Clean glassmorphic modal overlay to add new incomes or expenses with form validations and dynamic categories.
![Add Transaction Dialog]
(<img width="200" height="272" alt="Screenshot 2026-06-14 172652" src="https://github.com/user-attachments/assets/52d1ed9d-a510-4a7b-8c32-9183f9261807" />)
