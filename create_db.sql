# Create database script for Berties books

# Create the database
CREATE DATABASE IF NOT EXISTS berties_books;
USE berties_books;

# Create the tables
CREATE TABLE IF NOT EXISTS books (
    id     INT AUTO_INCREMENT,
    name   VARCHAR(50),
    price  DECIMAL(5, 2),
    PRIMARY KEY(id)
);

# Create the application user for the app
CREATE USER IF NOT EXISTS 'berties_books_app'@'localhost' IDENTIFIED BY 'qwertyuiop';

# Give that user full access to this database
GRANT ALL PRIVILEGES ON berties_books.* TO 'berties_books_app'@'localhost';

# Apply the privilege changes
FLUSH PRIVILEGES;
CREATE TABLE IF NOT EXISTS audit (
    id INT AUTO_INCREMENT,
    username VARCHAR(50),
    success BOOLEAN,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message VARCHAR(255),
    PRIMARY KEY (id)
);
