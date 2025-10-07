import sqlite3

if __name__ == "__main__":
    con = sqlite3.connect("design.db")
    curs = con.cursor()

    #For email: CHECK "@" IN email value, CHECK "." IN email value, CHECK 2 characters after . 

    curs.execute(
    '''CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    email VARCHAR(320) UNIQUE NOT NULL,
    username VARCHAR (32) UNIQUE NOT NULL,
    password_hash CHAR(32) NOT NULL,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    );'''
    )

    #for analytics_shown and badges_shown, maximum of 4 shown each, 2 bytes (65,535)

    curs.execute(
    '''CREATE TABLE profiles(
    user_id INT PRIMARY KEY,
    bio VARCHAR(300),
    avatar INT,
    analytics_shown INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    );'''
    )