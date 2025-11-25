import sqlite3
import bcrypt
import re
import getpass # Allows typing password without showing characters on screen

class AuthSystem:
    def __init__(self, db_name="users.db"):
        self.db_name = db_name
        self.init_db()

    def init_db(self):
        """Creates the database table if it doesn't exist."""
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    password_hash BLOB NOT NULL
                )
            ''')
            conn.commit()

    def is_valid_email(self, email):
        """Simple regex for email validation."""
        pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        return re.match(pattern, email) is not None

    def sign_up(self):
        print("\n--- SIGN UP ---")
        full_name = input("Enter Full Name: ").strip()
        username = input("Enter Username: ").strip()
        email = input("Enter Email: ").strip()

        if not self.is_valid_email(email):
            print("❌ Invalid email format.")
            return

        password = getpass.getpass("Enter Password: ")
        confirm_password = getpass.getpass("Confirm Password: ")

        if password != confirm_password:
            print("❌ Passwords do not match.")
            return

        if len(password) < 6:
            print("❌ Password must be at least 6 characters.")
            return

        # Security: Hash the password with a random salt
        # bcrypt requires bytes, so we encode the string
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)

        try:
            with sqlite3.connect(self.db_name) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO users (username, email, full_name, password_hash)
                    VALUES (?, ?, ?, ?)
                ''', (username, email, full_name, hashed_password))
                conn.commit()
                print("✅ Account created successfully!")
        except sqlite3.IntegrityError:
            print("❌ Username or Email already exists. Please try again.")

    def sign_in(self):
        print("\n--- SIGN IN ---")
        # User can enter either username or email
        identifier = input("Enter Username or Email: ").strip()
        password = getpass.getpass("Enter Password: ")

        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            # Logic to find user by EITHER username OR email
            cursor.execute('''
                SELECT full_name, password_hash FROM users 
                WHERE username = ? OR email = ?
            ''', (identifier, identifier))
            
            user = cursor.fetchone()

            if user:
                full_name, stored_hash = user
                
                # Security: Check the provided password against the stored hash
                if bcrypt.checkpw(password.encode('utf-8'), stored_hash):
                    print(f"\n🎉 Welcome back, {full_name}!")
                    print("✅ Login Successful.")
                    return True
                else:
                    print("❌ Invalid credentials (wrong password).")
            else:
                print("❌ Invalid credentials (user not found).")
        return False

def main():
    system = AuthSystem()
    
    while True:
        print("\n=== SECURE LOGIN SYSTEM ===")
        print("1. Sign Up")
        print("2. Sign In")
        print("3. Exit")
        
        choice = input("Select an option: ")
        
        if choice == '1':
            system.sign_up()
        elif choice == '2':
            system.sign_in()
        elif choice == '3':
            print("Goodbye!")
            break
        else:
            print("Invalid option.")

if __name__ == "__main__":
    main()