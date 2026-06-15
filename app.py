import os
import sqlite3
from flask import Flask, request, jsonify, render_template

app = Flask(__name__, template_folder='templates', static_folder='static')

# Use Vercel's writable /tmp folder for SQLite database in serverless functions
if os.environ.get('VERCEL'):
    DATABASE = '/tmp/expenses.db'
else:
    DATABASE = 'expenses.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if not os.path.exists(DATABASE) or os.path.getsize(DATABASE) == 0:
        conn = get_db_connection()
        conn.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL, -- 'income' or 'expense'
                category TEXT NOT NULL,
                date TEXT NOT NULL, -- 'YYYY-MM-DD'
                description TEXT
            )
        ''')
        # Insert some seed data to make it look beautiful right away!
        seed_data = [
            ("Monthly Salary", 4500.00, "income", "Salary", "2026-05-01", "Primary job salary"),
            ("Apartment Rent", 1200.00, "expense", "Housing", "2026-05-02", "May rent invoice"),
            ("Grocery Shopping", 154.30, "expense", "Food", "2026-05-05", "Weekly groceries at Trader Joe's"),
            ("Freelance Design Project", 850.00, "income", "Freelance", "2026-05-10", "Logo design project completed"),
            ("Electricity & Water Bill", 95.40, "expense", "Utilities", "2026-05-12", "Monthly utility payment"),
            ("Sushi Dinner with Friends", 78.00, "expense", "Food", "2026-05-15", "Social gathering dinner"),
            ("Gym Membership", 50.00, "expense", "Health & Wellness", "2026-05-18", "Monthly gym dues"),
            ("Gas Refuel", 45.00, "expense", "Transportation", "2026-05-20", "Fuel for commuter car"),
            ("Online Coding Course", 29.99, "expense", "Education", "2026-05-22", "Fullstack Javascript course"),
            ("Birthday Cash Gift", 100.00, "income", "Other Income", "2026-05-24", "Gift from grandparents"),
            ("Coffee Shop", 8.75, "expense", "Food", "2026-05-26", "Latte and croissant"),
            ("Streaming Subscription", 15.99, "expense", "Entertainment", "2026-05-28", "Netflix family plan")
        ]
        
        # Add current month transactions to show dynamic current statistics
        import datetime
        current_year_month = datetime.datetime.now().strftime("%Y-%m")
        current_seed_data = [
            ("Monthly Salary", 4500.00, "income", "Salary", f"{current_year_month}-01", "Primary job salary"),
            ("Apartment Rent", 1200.00, "expense", "Housing", f"{current_year_month}-02", "June rent invoice"),
            ("Weekly Groceries", 142.50, "expense", "Food", f"{current_year_month}-03", "Groceries at Whole Foods"),
            ("Freelance Writing", 300.00, "income", "Freelance", f"{current_year_month}-04", "Blog post article content")
        ]
        
        conn.executemany(
            'INSERT INTO transactions (title, amount, type, category, date, description) VALUES (?, ?, ?, ?, ?, ?)',
            seed_data + current_seed_data
        )
        conn.commit()
        conn.close()

# Ensure database is initialized
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    conn = get_db_connection()
    search = request.args.get('search', '')
    transaction_type = request.args.get('type', '') # 'income', 'expense' or '' (all)
    category = request.args.get('category', '')
    
    query = 'SELECT * FROM transactions WHERE 1=1'
    params = []
    
    if search:
        query += ' AND (title LIKE ? OR description LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])
    
    if transaction_type:
        query += ' AND type = ?'
        params.append(transaction_type)
        
    if category:
        query += ' AND category = ?'
        params.append(category)
        
    query += ' ORDER BY date DESC, id DESC'
    
    rows = conn.execute(query, params).fetchall()
    conn.close()
    
    transactions = []
    for r in rows:
        transactions.append({
            'id': r['id'],
            'title': r['title'],
            'amount': r['amount'],
            'type': r['type'],
            'category': r['category'],
            'date': r['date'],
            'description': r['description']
        })
        
    return jsonify(transactions)

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    title = data.get('title')
    amount = data.get('amount')
    transaction_type = data.get('type')
    category = data.get('category')
    date = data.get('date')
    description = data.get('description', '')
    
    if not title or amount is None or not transaction_type or not category or not date:
        return jsonify({'error': 'Missing required fields'}), 400
        
    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than zero'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid amount value'}), 400
        
    if transaction_type not in ['income', 'expense']:
        return jsonify({'error': 'Invalid transaction type'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO transactions (title, amount, type, category, date, description)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (title, amount, transaction_type, category, date, description))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    
    return jsonify({
        'id': new_id,
        'title': title,
        'amount': amount,
        'type': transaction_type,
        'category': category,
        'date': date,
        'description': description,
        'message': 'Transaction added successfully'
    }), 201

@app.route('/api/transactions/<int:tx_id>', methods=['PUT'])
def update_transaction(tx_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    title = data.get('title')
    amount = data.get('amount')
    transaction_type = data.get('type')
    category = data.get('category')
    date = data.get('date')
    description = data.get('description', '')
    
    if not title or amount is None or not transaction_type or not category or not date:
        return jsonify({'error': 'Missing required fields'}), 400
        
    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than zero'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid amount value'}), 400
        
    if transaction_type not in ['income', 'expense']:
        return jsonify({'error': 'Invalid transaction type'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if exists
    tx = cursor.execute('SELECT * FROM transactions WHERE id = ?', (tx_id,)).fetchone()
    if not tx:
        conn.close()
        return jsonify({'error': 'Transaction not found'}), 404
        
    cursor.execute('''
        UPDATE transactions
        SET title = ?, amount = ?, type = ?, category = ?, date = ?, description = ?
        WHERE id = ?
    ''', (title, amount, transaction_type, category, date, description, tx_id))
    conn.commit()
    conn.close()
    
    return jsonify({
        'id': tx_id,
        'title': title,
        'amount': amount,
        'type': transaction_type,
        'category': category,
        'date': date,
        'description': description,
        'message': 'Transaction updated successfully'
    })

@app.route('/api/transactions/<int:tx_id>', methods=['DELETE'])
def delete_transaction(tx_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    tx = cursor.execute('SELECT * FROM transactions WHERE id = ?', (tx_id,)).fetchone()
    if not tx:
        conn.close()
        return jsonify({'error': 'Transaction not found'}), 404
        
    cursor.execute('DELETE FROM transactions WHERE id = ?', (tx_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Transaction deleted successfully'})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db_connection()
    
    # Total Income & Expenses
    totals = conn.execute('''
        SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
        FROM transactions
    ''').fetchone()
    
    total_income = totals['total_income'] if totals['total_income'] else 0.0
    total_expense = totals['total_expense'] if totals['total_expense'] else 0.0
    balance = total_income - total_expense
    
    # Category totals for Expenses
    category_expenses = conn.execute('''
        SELECT category, SUM(amount) as value
        FROM transactions
        WHERE type = 'expense'
        GROUP BY category
        ORDER BY value DESC
    ''').fetchall()
    
    cat_exp = [{'category': row['category'], 'value': row['value']} for row in category_expenses]
    
    # Category totals for Income
    category_income = conn.execute('''
        SELECT category, SUM(amount) as value
        FROM transactions
        WHERE type = 'income'
        GROUP BY category
        ORDER BY value DESC
    ''').fetchall()
    
    cat_inc = [{'category': row['category'], 'value': row['value']} for row in category_income]
    
    # Monthly history (grouped by YYYY-MM) for line charts
    monthly_data = conn.execute('''
        SELECT 
            strftime('%Y-%m', date) as month,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        GROUP BY month
        ORDER BY month ASC
        LIMIT 12
    ''').fetchall()
    
    history = [{
        'month': row['month'],
        'income': row['income'] if row['income'] else 0.0,
        'expense': row['expense'] if row['expense'] else 0.0
    } for row in monthly_data]
    
    conn.close()
    
    return jsonify({
        'total_income': total_income,
        'total_expense': total_expense,
        'balance': balance,
        'category_expenses': cat_exp,
        'category_income': cat_inc,
        'monthly_history': history
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000, use_reloader=False)
